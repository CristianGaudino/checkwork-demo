import { ADDONS, planOf } from "@/lib/plans";

// Money and limits for the platform pages. Pure, so the rules are tested.
export type Billable = { plan: string; addons: string[]; status: "active" | "trial" | "paused" };

// What a dealership pays each month: its plan plus its add-ons. A trial or a paused account pays nothing yet.
export function monthlyEur(d: Billable): number {
  if (d.status !== "active") return 0;
  const extras = d.addons.reduce((s, id) => s + (ADDONS.find((a) => a.id === id)?.priceEur ?? 0), 0);
  return planOf(d.plan).priceEur + extras;
}

export type UsageState = { pct: number; tone: "good" | "warn" | "bad"; label: string };
// How much of a limit is used. Under 80% is fine, 80 to 100 is close, over 100 is over. A limit of 0 reads as over if anything is used.
export function usageState(used: number, limit: number): UsageState {
  const pct = limit > 0 ? (used / limit) * 100 : used > 0 ? 101 : 0;
  return pct > 100 ? { pct, tone: "bad", label: "Over the limit" } : pct >= 80 ? { pct, tone: "warn", label: "Close to the limit" } : { pct, tone: "good", label: "Within the limit" };
}
