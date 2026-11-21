import Link from "next/link";
import { notFound } from "next/navigation";
import { ActButton } from "@/components/admin/ActButton";
import { AlertForm, DetailsForm, LimitsForm } from "@/components/admin/BillingForms";
import { Badge, DataTable, EmptyState, PageHeader, Panel, Segmented, adminButtonQuiet, rowButton } from "@/components/admin/kit";
import { fmtDay, fmtNum, plural } from "@/lib/admin/format";
import { MODULES } from "@/lib/modules-rules";
import { enabledModules } from "@/lib/modules";
import { can, currentMember } from "@/lib/permissions";
import { billingDetails, listBills } from "@/lib/billing/bills";
import { eur, fmtMonth, itemise, nextBillDate, scopeName, billedServices } from "@/lib/billing/bills-rules";
import { AI_MODELS, KINDS, SHOW_PRICING, TERM_LABELS, allowanceFor, setupEur, setupLines, SERVICE_LABELS, UNIT_PRICE_EUR, VAT_PCT, capOf, planEur, planFor, planLines, termSetupEur, usageEstimate, round2, withVat, yearUpfrontEur, type BillingSettings, type Scope, type Service, type UsageCount } from "@/lib/billing/rules";
import { billingSettings, monthCounts, monthUsage } from "@/lib/billing/usage";
import { removeAlertAction, saveAiModelAction } from "./actions";
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
const USE_WORD: Record<Service, [string, string]> = { lookup: ["lookup", "lookups"], ai: ["AI action", "AI actions"], whatsapp: ["message", "messages"] };
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
  const plan = planEur(modules, b);
  const sofar = usage.totalEur;
  const estimate = usageEstimate(counts, allowanceFor(modules, b), b, dublinDay(now.getTime()));
  const bill = round2((b.term === "annual" ? 0 : plan) + estimate); // a year paid upfront: each month's bill is the usage only
  const setup = setupLines(modules, b);
  const setupFull = setupEur(modules, b);
  const setupNet = termSetupEur(setupFull, b.term);
  const allowance = allowanceFor(modules, b);
  const lines = planLines(modules, b).map((l) => [l.label, l.eur] as const);
  const total = withVat(bill);
  return (
    <>
      {/* What most people come for first: this month's bill, and what it is made of, in one place. Beside it, what to do if it looks wrong. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <Panel title="This month's bill">
          <div>
            <p className="font-display text-[2.5rem] font-semibold leading-none tracking-[-0.02em] tabular-nums">{eur(total)}</p>
            <p className="mt-2 text-meta text-text-2">Estimate with {VAT_PCT}% VAT. Next bill on {nextBillDate(now)}</p>
          </div>
          <dl className="flex flex-col divide-y divide-hairline text-body">
            <div className="flex justify-between gap-4 py-2">
              <dt>{b.term === "annual" ? "Your plan, paid for the year" : "Your plan"}</dt>
              <dd className="tabular-nums">{b.term === "annual" ? eur(0) : eur(plan)}</dd>
            </div>
            {services.length > 0 && (
              <div className="flex justify-between gap-4 py-2">
                <dt className="flex flex-col">
                  Pay as you go, by month end
                  <span className="text-meta text-text-2">{eur(sofar)} so far</span>
                </dt>
                <dd className="tabular-nums">{eur(estimate)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 py-2">
              <dt>VAT at {VAT_PCT}%</dt>
              <dd className="tabular-nums">{eur(round2(total - bill))}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2 font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{eur(total)}</dd>
            </div>
          </dl>
        </Panel>
        <Panel title="Something look wrong?" quiet>
          <p className="text-body text-text-2">Tell us what you expected and we check it. Our reply shows in Help.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/help?type=Billing&from=/dashboard/billing" className={adminButtonQuiet}>
              Ask about my bill
            </Link>
            <Link href="/dashboard/billing?section=bills" className={rowButton}>
              Past bills
            </Link>
          </div>
        </Panel>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
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
          {b.term === "annual" && `: ${eur(yearUpfrontEur(plan))} a year, before VAT`}
        </p>
      </Panel>

      <Panel title="Pay as you go this month" action={services.length > 0 ? <Link href="/dashboard/billing?section=limits" className="text-meta font-medium text-accent-text underline underline-offset-2">Set a limit</Link> : undefined}>
        {services.length === 0 ? (
          <EmptyState title="No usage is billed" text="Nothing on your site is charged per use." />
        ) : (
          <ul className="flex flex-col divide-y divide-hairline">
            {services.map((s) => (
              <li key={s}>
                {/* One line each, the detail one tap away. */}
                <details className="group">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-2 text-body [&::-webkit-details-marker]:hidden">
                    {/* The uses in words beside the name, so the cost reads as something done: 48 messages, €7.20. */}
                    <span className="flex flex-col">
                      <span className="font-medium">{SERVICE_LABELS[s]}</span>
                      <span className="text-meta text-text-2">
                        {plural(usage[s].kinds.reduce((n, k) => n + k.count, 0), USE_WORD[s][0], USE_WORD[s][1])}
                        {allowance[s] ? `, ${fmtNum(allowance[s])} ${INCLUDED[s]} in your plan` : ""}
                      </span>
                    </span>
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
      </div>

      <Panel title="Setup fees" quiet>
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
  return (
    <>
      <PageHeader title="Billing" text="What you pay us each month, and what you have used so far." />
      <Panel title={`Your plan: ${planFor(modules, b).name}`}>
        {/* Folded: a long list would bury the billing details below it on a phone. */}
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
        <p className="text-meta text-text-2">{TERM_LABELS[b.term]}</p>
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
