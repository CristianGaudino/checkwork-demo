import { describe, expect, it } from "vitest";
import extra from "./demo-cars-extra.json";
import { createStockEngine } from "./engine";
import { DEFAULT_QUERY } from "./query";
import type { Car } from "./types";

const car = (id: string, o: Partial<Car> = {}): Car => ({ id, slug: `make-model-2020-${id}`, make: "Make", makeSlug: "make", model: "Model", modelSlug: "model", year: 2020, priceEur: 10000, photos: [], ...o });
const engine = createStockEngine([car("1"), car("2", { condition: "used" }), car("3", { condition: "new" }), car("4", { condition: "commercial", vat: "ex" })]);
const ids = async (condition?: Car["condition"]) => (await engine.query({ ...DEFAULT_QUERY, condition })).cars.map((c) => c.id).sort();

describe("stock condition", () => {
  it("lists used cars by default, and new and commercial only when asked", async () => {
    expect(await ids()).toEqual(["1", "2"]);
    expect(await ids("new")).toEqual(["3"]);
    expect(await ids("commercial")).toEqual(["4"]);
  });
  it("still opens any car by its link, whatever its kind", async () => {
    expect((await engine.getBySlug("make-model-2020-3"))?.id).toBe("3");
    expect((await engine.lookup("make-model-2020-4"))?.state).toBe("live");
  });
  it("keeps new and commercial out of the make and body lists the used pages use", async () => {
    const t = await engine.taxonomy();
    expect(t.makes).toHaveLength(1);
    const withNew = createStockEngine([car("1"), car("3", { condition: "new", make: "Kia", makeSlug: "kia" })]);
    expect((await withNew.taxonomy()).makes.map((m) => m.slug)).toEqual(["make"]);
  });
  it("facets on a kind count only that kind", async () => {
    const r = await engine.query({ ...DEFAULT_QUERY, condition: "new" });
    expect(r.facets.make.map((m) => [m.value, m.count])).toEqual([["make", 1]]);
  });
});

describe("the demo's new cars and vans", () => {
  const cars = extra as Car[];
  it("have unique digit ids and slugs that end in them", () => {
    expect(new Set(cars.map((c) => c.id)).size).toBe(cars.length);
    for (const c of cars) expect(c.slug.endsWith(`-${c.id}`) && /^\d+$/.test(c.id)).toBe(true);
  });
  it("say their kind, and every van says its price is without VAT", () => {
    expect(cars.filter((c) => c.condition === "new")).toHaveLength(6);
    const vans = cars.filter((c) => c.condition === "commercial");
    expect(vans).toHaveLength(6);
    expect(vans.every((v) => v.vat === "ex" && ["van", "pickup"].includes(v.bodySlug!))).toBe(true);
    expect(cars.filter((c) => c.wasPriceEur !== undefined).every((c) => c.wasPriceEur! > c.priceEur)).toBe(true);
  });
});
