import { describe, expect, it } from "vitest";
import { searchOptions } from "./search-options";
import type { Car } from "./types";

const car = (make: string, model: string, body?: string) =>
  ({ make, makeSlug: make.toLowerCase(), model, modelSlug: model.toLowerCase(), bodyType: body, bodySlug: body?.toLowerCase() }) as Car;

describe("searchOptions", () => {
  it("lists each make, body type and model once, sorted, from the cars it is given", () => {
    const o = searchOptions([car("Volkswagen", "Golf", "Hatchback"), car("Audi", "A4", "Saloon"), car("Volkswagen", "Polo", "Hatchback"), car("Audi", "A4", "Saloon")]);
    expect(o.makes.map((m) => m.slug)).toEqual(["audi", "volkswagen"]);
    expect(o.bodies.map((b) => b.label)).toEqual(["Hatchback", "Saloon"]);
    expect(o.models).toEqual([
      { makeSlug: "audi", slug: "a4", label: "A4" },
      { makeSlug: "volkswagen", slug: "golf", label: "Golf" },
      { makeSlug: "volkswagen", slug: "polo", label: "Polo" },
    ]);
  });

  it("offers nothing a car of its own does not back, and skips a car with no body type", () => {
    const o = searchOptions([car("Ford", "Focus")]);
    expect(o.bodies).toEqual([]);
    expect(o.models).toEqual([{ makeSlug: "ford", slug: "focus", label: "Focus" }]);
    expect(searchOptions([])).toEqual({ makes: [], bodies: [], models: [] });
  });

  it("keeps the same model name under two makes apart", () => {
    const o = searchOptions([car("Audi", "Q5"), car("BMW", "Q5")]);
    expect(o.models).toHaveLength(2);
  });
});

describe("newest first by listing date", () => {
  it("sorts by the date the car went on the site, and a car without one keeps its id order", async () => {
    const { createStockEngine } = await import("./engine");
    const { DEFAULT_QUERY } = await import("./query");
    const base = { make: "Kia", makeSlug: "kia", model: "Rio", modelSlug: "rio", year: 2019, priceEur: 1, photos: [] };
    const engine = createStockEngine([
      { ...base, id: "3", slug: "kia-rio-2019-3", listedAt: "2026-10-01" },
      { ...base, id: "2", slug: "kia-rio-2019-2", listedAt: "2026-11-05" },
      { ...base, id: "1", slug: "kia-rio-2019-1" },
    ]);
    const r = await engine.query({ ...DEFAULT_QUERY, sort: "newest" });
    expect(r.cars.map((c) => c.id)).toEqual(["2", "3", "1"]);
  });
});
