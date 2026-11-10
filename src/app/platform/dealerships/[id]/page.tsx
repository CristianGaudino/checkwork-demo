import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Field, PageHeader, Panel, StatCard, StatGrid, adminButton, adminButtonQuiet, adminInput, type Tone } from "@/components/admin/kit";
import { fmtDate, fmtEur, fmtNum } from "@/lib/admin/format";
import { dealershipsStore } from "@/lib/admin/platform";
import { monthlyEur, usageState } from "@/lib/admin/platform-calc";
import { ADDONS, PLANS, planOf } from "@/lib/plans";
import { activateTrialAction, setPlanAction, toggleAddonAction, toggleStatusAction } from "../../actions";

export const metadata = { title: "Dealership" };

const TONE: Record<string, Tone> = { active: "good", trial: "info", paused: "warn" };
const LABEL: Record<string, string> = { active: "Active", trial: "On trial", paused: "Paused" };
const BAR = { good: "bg-accent", warn: "bg-warning", bad: "bg-destructive" } as const;

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const u = usageState(used, limit);
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span>{label}</span>
        <span className="tabular-nums">
          {fmtNum(used)} of {fmtNum(limit)} · {u.label}
        </span>
      </div>
      <span className="h-2 overflow-hidden rounded-full bg-hairline" aria-hidden="true">
        <span className={`block h-full rounded-full ${BAR[u.tone]}`} style={{ width: `${Math.min(100, u.pct)}%` }} />
      </span>
    </li>
  );
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await dealershipsStore.get(id);
  if (!d) notFound();
  const plan = planOf(d.plan);

  return (
    <>
      <PageHeader title={d.name} text={`${d.town} · owner ${d.owner} · joined ${fmtDate(d.createdAt)}`} actions={<Link href="/platform" className={adminButtonQuiet}>All dealerships</Link>} />
      <StatGrid>
        <StatCard label="Status" value={LABEL[d.status]} />
        <StatCard label="Plan" value={plan.name} />
        <StatCard label="Per month" value={monthlyEur(d) ? fmtEur(monthlyEur(d)) : "None"} hint={d.status === "trial" ? "Starts when the trial ends" : undefined} />
        <StatCard label="Leads this month" value={fmtNum(d.leadsMonth)} />
      </StatGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Usage" action={<Badge tone={TONE[d.status]}>{LABEL[d.status]}</Badge>}>
          <ul className="flex flex-col gap-4">
            <Meter label="Cars" used={d.cars} limit={plan.limits.cars} />
            <Meter label="Leads this month" used={d.leadsMonth} limit={plan.limits.leads} />
            <Meter label="Team seats" used={d.seats} limit={plan.limits.seats} />
          </ul>
        </Panel>

        <Panel title="Plan and account">
          <form action={setPlanAction.bind(null, d.id)} className="flex flex-wrap items-end gap-3">
            <Field label="Plan">
              <select name="plan" defaultValue={d.plan} className={`${adminInput} w-48`}>
                {PLANS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({fmtEur(p.priceEur)} a month)
                  </option>
                ))}
              </select>
            </Field>
            <button type="submit" className={adminButton}>
              Change plan
            </button>
          </form>
          <div className="flex flex-wrap gap-3">
            {d.status === "trial" && (
              <form action={activateTrialAction.bind(null, d.id)}>
                <button type="submit" className={adminButton}>
                  End trial and start billing
                </button>
              </form>
            )}
            <form action={toggleStatusAction.bind(null, d.id)}>
              <button type="submit" className={adminButtonQuiet}>
                {d.status === "paused" ? "Resume the account" : "Pause the account"}
              </button>
            </form>
          </div>
        </Panel>
      </div>

      <Panel title="Add-ons">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ADDONS.map((a) => {
            const on = d.addons.includes(a.id);
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-control border border-hairline p-3">
                <div className="min-w-0">
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-meta text-text-2">
                    {a.blurb} {fmtEur(a.priceEur)} a month.
                  </p>
                </div>
                <form action={toggleAddonAction.bind(null, d.id, a.id)}>
                  <button type="submit" aria-pressed={on} aria-label={`${a.name}: ${on ? "on" : "off"}`} className={on ? adminButton : adminButtonQuiet}>
                    {on ? "On" : "Off"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
