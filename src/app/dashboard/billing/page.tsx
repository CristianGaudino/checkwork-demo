import Link from "next/link";
import { notFound } from "next/navigation";
import { ActButton } from "@/components/admin/ActButton";
import { AlertForm, DetailsForm, LimitsForm } from "@/components/admin/BillingForms";
import { Badge, DataTable, EmptyState, PageHeader, Panel, Segmented, StatCard, StatGrid, adminButtonQuiet, rowButton } from "@/components/admin/kit";
import { fmtDay, fmtNum } from "@/lib/admin/format";
import { MODULES, withModule } from "@/lib/modules-rules";
import { enabledModules } from "@/lib/modules";
import { can, currentMember } from "@/lib/permissions";
import { billingDetails, listBills } from "@/lib/billing/bills";
import { eur, fmtMonth, itemise, nextBillDate, scopeName, billedServices } from "@/lib/billing/bills-rules";
import { AI_MODELS, KINDS, MODULE_EUR, SHOW_PRICING, TERM_LABELS, allowanceFor, setupEur, setupLines, SERVICE_LABELS, UNIT_PRICE_EUR, VAT_PCT, capOf, planEur, planFor, planLines, termSetupEur, usageEstimate, round2, withVat, yearUpfrontEur, type BillingSettings, type Scope, type Service, type UsageCount } from "@/lib/billing/rules";
import { billingSettings, monthCounts, monthUsage } from "@/lib/billing/usage";
import { askModuleAction, removeAlertAction, saveAiModelAction } from "./actions";
import { dublinDay } from "@/lib/admin/format";
import { ChevronDownIcon } from "@/components/stock/icons";

export const metadata = { title: "Billing" };

const SECTIONS = [["plan", "Plan"], ["limits", "Limits"], ["bills", "Bills"]] as const; // short, so the three fit a phone on one line
const AT_LIMIT: Record<Service, string> = {
  lookup: "The lookup button says the limit is reached, and the details are typed in.",
  ai: "The AI button says the limit is reached, and the text is left as it was.",
  whatsapp: "Replies go by email instead and marketing messages are not sent. Alerts your plan includes still go by WhatsApp.",
};
const INCLUDED: Record<Service, string> = { lookup: "lookups", ai: "AI actions", whatsapp: "WhatsApp alerts" };
const today = () => new Date();
const UNIT = UNIT_PRICE_EUR as Record<Service, Record<string, number>>;
type Modules = Awaited<ReturnType<typeof enabledModules>>;
type Usage = Awaited<ReturnType<typeof monthUsage>>;

// Owners and managers only (the "billing" permission): without it the page is not there, whatever the menu showed.
export default async function Page({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  if (!(await can("billing"))) notFound();
  if (!SHOW_PRICING) return <WithoutPrices />;
  const sp = await searchParams;
  const section = SECTIONS.find(([k]) => k === sp.section)?.[0] ?? "plan";
  const [modules, b, usage, counts, me] = await Promise.all([enabledModules(), billingSettings(), monthUsage(), monthCounts(), currentMember()]);
  const services = billedServices(modules, usage);
  const scopes: Scope[] = [...services, "total"];
  return (
    <>
      <PageHeader title="Billing" text="What you pay us each month, and what you have used so far." />
      <Segmented label="Billing sections" items={SECTIONS.map(([k, label]) => ({ label, href: k === "plan" ? "/dashboard/billing" : `/dashboard/billing?section=${k}`, active: k === section }))} />

      {section === "plan" && <PlanAndUsage modules={modules} services={services} usage={usage} counts={counts} b={b} now={today()} />}

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
                { key: "then", header: "At the limit", hide: "md", cell: (s) => (s === "total" ? "Paid use stops, each as above." : AT_LIMIT[s]), className: "max-w-[24rem]" },
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
            <Panel title="AI writing">
              <p className="max-w-measure text-body text-text-2">Premium writes the best copy. Standard is quick and costs less.</p>
              <div className="flex flex-wrap gap-2">
                {AI_MODELS.map((m) => (
                  <ActButton key={m} act={saveAiModelAction.bind(null, m)} pressed={b.aiModel === m} done="Writing quality changed" className={`${adminButtonQuiet} aria-pressed:border-text aria-pressed:bg-text aria-pressed:text-ink`}>
                    {KINDS.ai[m]}, {eur(UNIT.ai[m])} an action
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

function PlanAndUsage({ modules, services, usage, counts, b, now }: { modules: Modules; services: Service[]; usage: Usage; counts: UsageCount[]; b: BillingSettings; now: Date }) {
  // What adding a module costs: with what it needs, and a tier it completes. 0 when the plan already pays for it.
  const addEur = (id: (typeof MODULES)[number]["id"]) => planFor(withModule(modules, id), b).eur - planFor(modules, b).eur;
  const others = MODULES.filter((m) => !modules.has(m.id) && MODULE_EUR[m.id] > 0);
  const plan = planEur(modules, b);
  const sofar = usage.totalEur;
  const estimate = usageEstimate(counts, allowanceFor(modules, b), b, dublinDay(now.getTime()));
  const bill = round2((b.term === "annual" ? 0 : plan) + estimate); // a year paid upfront: each month's bill is the usage only
  const setup = setupLines(modules, b);
  const setupFull = setupEur(modules, b);
  const setupNet = termSetupEur(setupFull, b.term);
  const allowance = allowanceFor(modules, b);
  const lines = planLines(modules, b).map((l) => [l.label, l.eur] as const);
  return (
    <>
      {/* What most people come for first: this month's bill. The detail is below it. */}
      <StatGrid>
        <StatCard label={`This month's bill with ${VAT_PCT}% VAT`} value={eur(withVat(bill))} hint="Estimate" />
        <StatCard label="Before VAT" value={eur(bill)} hint="Estimate" />
        {services.length > 0 && <StatCard label="Usage so far" value={eur(sofar)} hint={`About ${eur(estimate)} by month end`} />}
      </StatGrid>
      <Panel title="Your plan">
        <dl className="flex flex-col divide-y divide-hairline text-body">
          {lines.map(([label, n]) => (
            <div key={label} className="flex justify-between gap-4 py-2">
              <dt>{label}</dt>
              <dd className="tabular-nums">{eur(n)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 py-2 font-semibold">
            <dt>Plan each month, before VAT</dt>
            <dd className="tabular-nums">{eur(plan)}</dd>
          </div>
        </dl>
        <p className="text-meta text-text-2">
          {TERM_LABELS[b.term]}
          {b.term === "annual" && `: ${eur(yearUpfrontEur(plan))} a year, before VAT`}. Next bill: {nextBillDate(now)}
        </p>
        {others.length > 0 && (
          <details className="rounded-control border border-hairline px-3">
            <summary className="min-h-11 cursor-pointer py-2.5 text-body font-medium">Add more to your plan</summary>
            <ul className="flex flex-col divide-y divide-hairline pb-2">
              {others.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <span>
                    {m.label} <span className="text-text-2">{addEur(m.id) ? `${eur(addEur(m.id))} a month` : "Included in your plan"}</span>
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
          <ul className="flex flex-col divide-y divide-hairline">
            {services.map((s) => (
              <li key={s}>
                {/* One line each, the detail one tap away. */}
                <details className="group">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-2 text-body [&::-webkit-details-marker]:hidden">
                    <span className="font-medium">{SERVICE_LABELS[s]}</span>
                    <span className="flex items-center gap-2 tabular-nums">
                      {eur(usage[s].costEur)}
                      <ChevronDownIcon aria-hidden="true" className="size-4 text-text-2 transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="flex flex-col gap-2 pb-4">
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
                    {allowance[s] ? <p className="text-meta text-text-2">The first {fmtNum(allowance[s])} {INCLUDED[s]} a month are in your plan.</p> : null}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Setup fees">
        <dl className="flex flex-col divide-y divide-hairline text-body">
          {setup.map((l) => (
            <div key={l.label} className="flex justify-between gap-4 py-2">
              <dt>{l.label}</dt>
              <dd className="tabular-nums">{eur(l.eur)}</dd>
            </div>
          ))}
          {b.term === "twoYear" && (
            <div className="flex justify-between gap-4 py-2 text-ok">
              <dt>2-year contract: no setup fee</dt>
              <dd className="whitespace-nowrap tabular-nums">-{eur(setupFull)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 py-2 font-semibold">
            <dt>Paid once at launch, before VAT</dt>
            <dd className="tabular-nums">{eur(setupNet)}</dd>
          </div>
        </dl>
      </Panel>
    </>
  );
}

// While our prices are hidden (SHOW_PRICING): the plan and its modules, the AI writing choice and the billing details, with no prices,
// limits or bills.
async function WithoutPrices() {
  const [modules, b, me, details] = await Promise.all([enabledModules(), billingSettings(), currentMember(), billingDetails()]);
  const on = MODULES.filter((m) => modules.has(m.id));
  const off = MODULES.filter((m) => !modules.has(m.id));
  return (
    <>
      <PageHeader title="Billing" text="What you pay us each month, and what you have used so far." />
      <Panel title={`Your plan: ${planFor(modules, b).name}`}>
        {on.length > 0 ? (
          // Folded: a long list would bury the billing details below it on a phone.
          <details className="rounded-control border border-hairline px-3">
            <summary className="min-h-11 cursor-pointer py-2.5 text-body font-medium">What is included ({on.length})</summary>
            <ul className="flex flex-col divide-y divide-hairline pb-2 text-body">
              {on.map((m) => (
                <li key={m.id} className="py-2">
                  <span className="font-medium">{m.label}</span>
                  <span className="block text-text-2">{m.blurb}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <p className="text-body text-text-2">The website, with your stock and the enquiry and contact forms.</p>
        )}
        <p className="text-meta text-text-2">{TERM_LABELS[b.term]}</p>
        {off.length > 0 && (
          <details className="rounded-control border border-hairline px-3">
            <summary className="min-h-11 cursor-pointer py-2.5 text-body font-medium">Add more to your plan</summary>
            <ul className="flex flex-col divide-y divide-hairline pb-2">
              {off.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <span>{m.label}</span>
                  <ActButton act={askModuleAction.bind(null, m.id)} done="We have your request. Our reply will show in Help." label={`Ask us to add ${m.label}`} className={rowButton}>
                    Ask us to add
                  </ActButton>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Panel>
      {modules.has("ai") && (
        <Panel title="AI writing">
          <p className="max-w-measure text-body text-text-2">Premium writes the best copy. Standard is quicker.</p>
          <div className="flex flex-wrap gap-2">
            {AI_MODELS.map((m) => (
              <ActButton key={m} act={saveAiModelAction.bind(null, m)} pressed={b.aiModel === m} done="Writing quality changed" className={`${adminButtonQuiet} aria-pressed:border-text aria-pressed:bg-text aria-pressed:text-ink`}>
                {KINDS.ai[m]}
              </ActButton>
            ))}
          </div>
        </Panel>
      )}
      <Panel title="Billing details">
        <DetailsForm details={details} editable={me.role === "Owner"} />
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
