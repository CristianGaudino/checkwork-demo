import { describe, expect, it } from "vitest";
import demoCars from "./demo-cars.json";
import { similarCars } from "./similar";
import { forSale } from "./types";
import type { Car } from "./types";

const cars = demoCars as Car[];
const soul = cars.find((c) => c.slug.startsWith("kia-soul-"))!;

describe("similar cars", () => {
  it("leads with the same body type near the price, never the car itself", async () => {
    const row = await similarCars(soul);
    expect(row.map((c) => c.id)).not.toContain(soul.id);
    expect(row[0].bodySlug).toBe(soul.bodySlug);
    expect(row[0].priceEur).toBeGreaterThanOrEqual(soul.priceEur * 0.75);
    expect(row[0].priceEur).toBeLessThanOrEqual(soul.priceEur * 1.25);
  });

  it("still leads with the same body type for a car with its price on request", async () => {
    const row = await similarCars({ ...soul, id: "on-request", priceEur: 0 });
    expect(row[0].bodySlug).toBe(soul.bodySlug);
  });

  it("offers only cars for sale, never a reserved one", async () => {
    expect(cars.some((c) => c.reserved)).toBe(true); // the demo has reserved cars, so this check means something
    for (const car of cars.filter(forSale)) for (const c of await similarCars(car)) expect(forSale(c), `${c.slug} beside ${car.slug}`).toBe(true);
  });
});
