import "server-only";
import { defineCollection } from "@/lib/docs";
import { dublinDay } from "@/lib/format";
import { countId, type DayCount } from "./rules";

// One record per day per event: the store grows by a few records a day, never one per use. The demo's counts are what its visitors do.
export const countStore = defineCollection<DayCount>("feature-counts");

// shortcut: read then write, so two uses at the same moment can count once. Fine for counts that show trends; a Durable Object if exact.
export async function bump(event: string, now = Date.now()): Promise<void> {
  const day = dublinDay(now);
  const id = countId(day, event);
  const prev = await countStore.get(id);
  await countStore.put({ id, day, event, count: (prev?.count ?? 0) + 1 });
}
