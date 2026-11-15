import { describe, expect, it } from "vitest";
import { sourcingPrefill } from "./sourcing-prefill";

describe("find a car, filled from a search", () => {
  it("takes the make, model, type and budget the form accepts", () => {
    expect(sourcingPrefill({ make: "volkswagen", model: "Golf", body: "suv", budget: "20000" })).toEqual({ make: "Volkswagen", model: "Golf", bodyType: "SUV", budgetMax: "20000" });
  });

  it("leaves out what the form would refuse", () => {
    expect(sourcingPrefill({ make: "not-a-make", body: "spaceship", budget: "21000", model: "x".repeat(61) })).toBeUndefined();
    expect(sourcingPrefill({ make: ["audi", "bmw"], model: "a\nb", budget: "0" })).toBeUndefined();
    expect(sourcingPrefill({})).toBeUndefined();
  });
});

describe("no cars match: the link to Find a car", () => {
  it("carries the search into the form", async () => {
    const { DEFAULT_QUERY, sourcingHref } = await import("@/lib/stock/query");
    const opt = (value: string, label: string) => ({ value, label, count: 0 });
    const facets = { make: [opt("volkswagen", "Volkswagen")], model: [opt("golf", "Golf")], body: [opt("hatchback", "Hatchback")], fuel: [], gearbox: [] } as unknown as import("@/lib/stock/types").Facets;
    const href = sourcingHref({ ...DEFAULT_QUERY, make: ["volkswagen"], model: ["golf"], body: ["hatchback"], priceMax: 15000 }, facets);
    const params = Object.fromEntries(new URL(href, "https://x.ie").searchParams);
    expect(sourcingPrefill(params)).toEqual({ make: "Volkswagen", model: "Golf", bodyType: "Hatchback", budgetMax: "15000" });
    expect(sourcingHref(DEFAULT_QUERY, null)).toBe("/find-a-car");
  });
});
