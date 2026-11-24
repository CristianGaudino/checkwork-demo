import { stock } from "./index";
import { DEFAULT_QUERY } from "./query";
import { forSale, onRequest } from "./types";
import type { Car } from "./types";

// Up to 8 cars to buy, for a row that moves along: same body type within a quarter of the price first, then same body type, then same
// make; never the car itself, and only cars for sale (each query puts reserved cars last only within its own results). Of the same kind (used or commercial), so a van never suggests used ones.
export async function similarCars(car: Car) {
  const kind = { ...DEFAULT_QUERY, ...(car.condition && car.condition !== "used" && { condition: car.condition }), pageSize: 8 };
  const body = car.bodySlug ? { ...kind, body: [car.bodySlug] } : undefined;
  const pools = await Promise.all([
    ...(body && !onRequest(car) ? [stock.query({ ...body, priceMin: Math.round(car.priceEur * 0.75), priceMax: Math.round(car.priceEur * 1.25) })] : []),
    ...(body ? [stock.query(body)] : []),
    stock.query({ ...kind, make: [car.makeSlug] }),
  ]);
  const seen = new Set([car.id]);
  return pools.flatMap((r) => r.cars).filter((c) => forSale(c) && !seen.has(c.id) && seen.add(c.id)).slice(0, 8);
}
