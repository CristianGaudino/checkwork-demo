import "server-only";
import { claimsStore, costsStore, prepStore } from "./collections";

// What each car cost the dealer in all: its cost price, its prep, and what warranty repairs on it cost after the sale. Only for cars with a
// cost price (prep alone is not the whole cost). Read only for staff with the margins permission (the callers check).
// shortcut: keyed by car, so a car returned, repaired and sold again carries the old repair into the new sale's profit. Rare; key repairs
// by sale if it ever matters.
export type CarCostTotal = { purchase: number; prep: number; claims: number; total: number };
export async function carCosts(): Promise<Map<string, CarCostTotal>> {
  const [costs, prep, claims] = await Promise.all([costsStore.list(), prepStore.list(), claimsStore.list()]);
  const prepOf = new Map(prep.map((p) => [p.id, p.lines.reduce((s, l) => s + l.eur, 0)]));
  const claimsOf = new Map<string, number>();
  for (const c of claims) if (c.costEur) claimsOf.set(c.carId, (claimsOf.get(c.carId) ?? 0) + c.costEur);
  return new Map(
    costs.map((c) => {
      const [p, k] = [prepOf.get(c.id) ?? 0, claimsOf.get(c.id) ?? 0];
      return [c.id, { purchase: c.costEur, prep: p, claims: k, total: c.costEur + p + k }];
    }),
  );
}
