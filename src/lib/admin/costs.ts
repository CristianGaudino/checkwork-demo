import "server-only";
import { costsStore, prepStore } from "./collections";

// What each car cost the dealer in all: its cost price plus its prep. Only for cars with a cost price (prep alone is not the whole cost).
// Read only for staff with the margins permission (the callers check).
export type CarCostTotal = { purchase: number; prep: number; total: number };
export async function carCosts(): Promise<Map<string, CarCostTotal>> {
  const [costs, prep] = await Promise.all([costsStore.list(), prepStore.list()]);
  const prepOf = new Map(prep.map((p) => [p.id, p.lines.reduce((s, l) => s + l.eur, 0)]));
  return new Map(costs.map((c) => [c.id, { purchase: c.costEur, prep: prepOf.get(c.id) ?? 0, total: c.costEur + (prepOf.get(c.id) ?? 0) }]));
}
