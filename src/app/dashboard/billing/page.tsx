import Link from "next/link";
import { notFound } from "next/navigation";
import { ActButton } from "@/components/admin/ActButton";
import { AlertForm, DetailsForm, LimitsForm } from "@/components/admin/BillingForms";
import { Badge, DataTable, EmptyState, PageHeader, Panel, Segmented, StatCard, StatGrid, adminButtonQuiet, rowButton } from "@/components/admin/kit";
import { fmtDay, fmtNum } from "@/lib/admin/format";
import { MODULES } from "@/lib/modules-rules";
import { enabledModules } from "@/lib/modules";
import { can, currentMember } from "@/lib/permissions";
import { billingDetails, listBills } from "@/lib/billing/bills";
import { AI_PLAN_LABELS, FOUNDING, afterDiscount, eur, fmtMonth, foundingEnd, itemise, nextBillDate, scopeName, billedServices } from "@/lib/billing/bills-rules";
import { AI_ASSISTANT, MODULE_EUR, SERVICE_LABELS, UNIT_PRICE_EUR, VAT_PCT, capOf, planEur, planLines, usageEstimate, round2, withVat, type BillingSettings, type Scope, type Service } from "@/lib/billing/rules";
import { billingSettings, monthUsage } from "@/lib/billing/usage";
import { askModuleAction, removeAlertAction, saveAiPlanAction } from "./actions";
import { dublinDay } from "@/lib/admin/format";

export const metadata = { title: "Billing" };

const SECTIONS = [["plan", "Plan"], ["limits", "Limits"], ["bills", "Bills"]] as const; // short, so the three fit a phone on one line
const AT_LIMIT: Record<Service, string> = {
  lookup: "The lookup button says the limit is reached, and the details are typed in.",
  ai: "The AI button says the limit is reached, and the text is left as it was.",
  whatsapp: "Alerts and replies go by email instead, and marketing messages are not sent.",
};
const today = () => new Date();
const UNIT = UNIT_PRICE_EUR as Record<Service, Record<string, number>>;
type Modules = Awaited<ReturnType<typeof enabledModules>>;
type Usage = Awaited<ReturnType<typeof monthUsage>>;

// Owners and managers only (the "billing" permission): without it the page is not there, whatever the menu showed.
export default async function Page({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  if (!(await can("billing"))) notFound();
  const sp = await searchParams;
  const section = SECTIONS.find(([k]) => k === sp.section)?.[0] ?? "plan";
  const [modules, b, usage, me] = await Promise.all([enabledModules(), billingSettings(), monthUsage(), currentMember()]);
  const services = billedServices(modules, usage);
  const scopes: Scope[] = [...services, "total"];
  return (
    <>
      <PageHeader title="Billing" />
      <Segmented label="Billing sections" items={SECTIONS.map(([k, label]) => ({ label, href: k === "plan" ? "/dashboard/billing" : `/dashboard/billing?section=${k}`, active: k === section }))} />

      {section === "plan" && <PlanAndUsage modules={modules} services={services} usage={usage} b={b} now={today()} />}

      {section === "limits" && (
        <>
          <Panel title="Monthly limits">
            <p className="max-w-measure text-body text-text-2">At a limit the service stops for the rest of the month. Raising a limit works at once.</p>
            <LimitsForm scopes={scopes} caps={b.caps} ceilings={b.ceilings} alertAt80={b.alertAt80} />
          </Panel>
          <Panel title="In force this month">
            <DataTable
              bare
              rows={scopes}
              rowKey={(s) => s}
              columns={[
                { key: "what", header: "What", cell: (s) => <span className="font-medium">{scopeName(s)}</span> },
                { key: "spent", header: "Spent", align: "right", cell: (s) => eur(s === "total" ? usage.totalEur : usage[s].costEur) },
                {
                  key: "cap",
                  header: "Limit",
                  align: "right",
                  cell: (s) => {
                    const c = capOf(b, s);
                    return c === undefined ? "None" : eur(c);
                  },
                },
                { key: "then", header: "At the limit", hide: "md", cell: (s) => (s === "total" ? "Every service stops, each as above." : AT_LIMIT[s]), className: "max-w-[24rem]" },
              ]}
            />
          </Panel>
          <Panel title="Alerts">
            <p className="max-w-measure text-body text-text-2">Each alert comes once a month, to the owner and managers.</p>
            {b.alerts.length > 0 ? (
              <ul className="flex flex-col divide-y divide-hairline">
                {b.alerts.map((a) => (
                  <li key={`${a.scope}-${a.amountEur}`} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <span>
                      Tell me when {scopeName(a.scope).toLowerCase()} passes {eur(a.amountEur)}
                    </span>
                    <ActButton act={removeAlertAction.bind(null, a.scope, a.amountEur)} done="Alert removed" confirm={{ title: "Remove this alert?", text: `You will no longer be told when this passes ${eur(a.amountEur)}.`, yes: "Remove" }} label={`Remove the ${scopeName(a.scope)} alert at ${eur(a.amountEur)}`} className={rowButton}>
                      Remove
                    </ActButton>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body text-text-2">No alerts of your own yet.</p>
            )}
            <AlertForm scopes={scopes} />
          </Panel>
          {modules.has("ai") && (
            <Panel title="AI plan">
              <p className="max-w-measure text-body text-text-2">
                Pay per action, or the AI assistant: {eur(AI_ASSISTANT.monthlyEur)} a month with {AI_ASSISTANT.actions} actions included, then per action.
              </p>
              <div className="flex flex-wrap gap-2">
                {(["perAction", "assistant"] as const).map((p) => (
                  <ActButton key={p} act={saveAiPlanAction.bind(null, p)} pressed={b.aiPlan === p} done="AI plan changed" className={`${adminButtonQuiet} aria-pressed:border-text aria-pressed:bg-text aria-pressed:text-ink`}>
                    {AI_PLAN_LABELS[p]}
                  </ActButton>
                ))}
              </div>
            </Panel>
          )}
        </>
      )}

      {section === "bills" && <Bills owner={me.role === "Owner"} />}
    </>
  );
}

function PlanAndUsage({ modules, services, usage, b, now }: { modules: Modules; services: Service[]; usage: Usage; b: BillingSettings; now: Date }) {
  const { aiPlan } = b;
  const others = MODULES.filter((m) => !modules.has(m.id) && MODULE_EUR[m.id] > 0);
  const assistant = aiPlan === "assistant" && modules.has("ai");
  const plan = planEur(modules, assistant ? "assistant" : "perAction");
  const planNet = afterDiscount(plan);
  const sofar = usage.totalEur;
  const estimate = usageEstimate(usage, b, dublinDay(now.getTime()));
  const bill = round2(planNet + estimate);
  const lines: (readonly [string, number])[] = [...planLines(modules).map((l) => [l.label, l.eur] as const), ...(assistant ? [["AI assistant", AI_ASSISTANT.monthlyEur] as const] : [])];
  return (
    <>
      <Panel title="Your plan">
        <dl className="flex flex-col divide-y divide-hairline text-body">
          {lines.map(([label, n]) => (
            <div key={label} className="flex justify-between gap-4 py-2">
              <dt>{label}</dt>
              <dd className="tabular-nums">{eur(n)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 py-2 text-ok">
            <dt>
              Founding dealer: {FOUNDING.pct}% off until {foundingEnd(now)}
            </dt>
            <dd className="whitespace-nowrap tabular-nums">-{eur(round2(plan - planNet))}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2 font-semibold">
            <dt>Plan each month, before VAT</dt>
            <dd className="tabular-nums">{eur(planNet)}</dd>
          </div>
        </dl>
        <p className="text-meta text-text-2">Next bill: {nextBillDate(now)}</p>
        {others.length > 0 && (
          <details className="rounded-control border border-hairline px-3">
            <summary className="min-h-11 cursor-pointer py-2.5 text-body font-medium">Ask us to add</summary>
            <ul className="flex flex-col divide-y divide-hairline pb-2">
              {others.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <span>
                    {m.label} <span className="text-text-2">{eur(MODULE_EUR[m.id])} a month</span>
                  </span>
                  <ActButton act={askModuleAction.bind(null, m.id)} done="We have your request. Our reply will show in Help." label={`Ask us to add ${m.label}`} className={rowButton}>
                    Ask us to add
                  </ActButton>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Panel>

      <Panel title="Usage this month">
        {services.length === 0 ? (
          <EmptyState title="No usage is billed" text="Nothing on your site is charged per use." />
        ) : (
          <>
            <StatGrid>
              <StatCard label="Usage so far" value={eur(sofar)} />
              <StatCard label="Usage by month end" value={eur(estimate)} hint="Estimate" />
              <StatCard label="Bill before VAT" value={eur(bill)} hint="Estimate" />
              <StatCard label={`Bill with ${VAT_PCT}% VAT`} value={eur(withVat(bill))} hint="Estimate" />
            </StatGrid>
            {services.map((s) => (
              <div key={s} className="flex flex-col gap-2">
                <h3 className="text-body font-semibold">{SERVICE_LABELS[s]}</h3>
                <DataTable
                  bare
                  rows={usage[s].kinds}
                  rowKey={(k) => k.kind}
                  columns={[
                    { key: "kind", header: "What", cell: (k) => k.label },
                    { key: "count", header: "Uses", align: "right", cell: (k) => fmtNum(k.count) },
                    { key: "price", header: "Each", align: "right", hide: "sm", cell: (k) => eur(UNIT[s][k.kind]) },
                    { key: "cost", header: "So far", align: "right", cell: (k) => eur(k.costEur) },
                  ]}
                />
                {s === "ai" && assistant && <p className="text-meta text-text-2">The first {AI_ASSISTANT.actions} actions are in your AI assistant plan.</p>}
              </div>
            ))}
          </>
        )}
      </Panel>
    </>
  );
}

async function Bills({ owner }: { owner: boolean }) {
  const [bills, details] = await Promise.all([listBills(), billingDetails()]);
  return (
    <>
      <Panel title="Bills">
        <DataTable
          bare
          rows={bills}
          rowKey={(x) => x.id}
          columns={[
            {
              key: "period",
              header: "Period",
              cell: (x) => (
                <Link href={`/dashboard/billing/${x.id}`} className="font-medium underline-offset-2 hover:underline">
                  {fmtMonth(x.id)}
                </Link>
              ),
            },
            { key: "total", header: "Total", align: "right", cell: (x) => eur(itemise(x).total, true) },
            { key: "status", header: "Status", cell: (x) => (x.status === "paid" ? <Badge tone="good">Paid</Badge> : <Badge tone="warn">Due {fmtDay(x.dueOn, "dayMonth")}</Badge>) },
          ]}
        />
        <p className="text-meta text-text-2">Invoices are emailed as PDFs when each bill is issued.</p>
      </Panel>
      <Panel title="Billing details">
        <DetailsForm details={details} editable={owner} />
      </Panel>
      <Panel title="How you pay">
        <p className="text-body">Payments are by direct debit.</p>
        <Link href="/dashboard/help?type=Billing&from=/dashboard/billing" className={`${adminButtonQuiet} w-fit`}>
          Change how you pay
        </Link>
      </Panel>
    </>
  );
}
