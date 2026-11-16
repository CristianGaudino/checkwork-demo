import "server-only";
import { defineCollection } from "@/lib/admin/docs";
import { dublinDay } from "@/lib/admin/format";
import { countId, type DayCount } from "./counter-rules";

// One record per day per event, like the usage counters (src/lib/billing/usage.ts): the store grows by a few records a day, never one per use.
// Nothing is seeded: the demo's counts are what its visitors do.
export const countStore = defineCollection<DayCount>("feature-counts", () => []);

// shortcut: read then write, so two uses at the same moment can count once. Fine for counts that show trends; a Durable Object if exact.
export async function bump(event: string, now = Date.now()): Promise<void> {
  const day = dublinDay(now);
  const id = countId(day, event);
  const prev = await countStore.get(id);
  await countStore.put({ id, day, event, count: (prev?.count ?? 0) + 1 });
}

// The totals for each event between two days (inclusive), split into the buyer's site and the dashboard.
export async function countsBetween(from: string, to: string): Promise<{ features: Record<string, number>; dashboard: Record<string, number> }> {
  const out = { features: {} as Record<string, number>, dashboard: {} as Record<string, number> };
  for (const c of await countStore.list()) {
    if (c.day < from || c.day > to) continue;
    const dash = c.event.startsWith("dash:");
    const into = dash ? out.dashboard : out.features;
    const key = dash ? c.event.slice(5) : c.event;
    into[key] = (into[key] ?? 0) + c.count;
  }
  return out;
}
