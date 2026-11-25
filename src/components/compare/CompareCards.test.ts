import { describe, expect, it } from "vitest";
import { ROWS } from "./CompareCards";
import { rank } from "@/lib/compare/rank";
import { financeMonthlyEur } from "@/lib/stock/price";
import type { Car } from "@/lib/stock/types";

const car = (o: Partial<Car>): Car => ({ id: "1", slug: "a-b-2020-1", make: "A", makeSlug: "a", model: "B", modelSlug: "b", year: 2020, priceEur: 15000, photos: [], ...o });
const row = (label: string) => ROWS.find((r) => r.label === label)!;

describe("compare rows", () => {
  it("compares the monthly estimate the car page gives, lower is better, and none for a sold car", () => {
    const finance = row("Finance");
    expect(finance.better).toBe("low");
    expect(finance.text(car({}))).toBe(`€${financeMonthlyEur({ priceEur: 15000 })} a month`);
    expect(finance.text(car({ soldAt: "2026-10-01" }))).toBeUndefined();
    // With no figure, a word on why.
    const why = (c: Car) => (finance.text(c) as React.ReactElement<{ children: string }>).props.children;
    expect(why(car({ reserved: true }))).toBe("Reserved");
    expect(why(car({ priceEur: 0 }))).toBe("Ask us");
    expect(why(car({ priceEur: 500 }))).toBe("Not offered");
    expect(rank([car({ priceEur: 12000 }), car({ priceEur: 20000 })].map(finance.number!))).toEqual(["low", "high"]);
  });
  it("ranks a later NCT higher, across a year end, and leaves out a month it cannot read", () => {
    const nct = row("NCT expires");
    expect(nct.better).toBe("high");
    expect(rank(["2027-12", "2028-01", "soon"].map((m) => nct.number!(car({ nctExpiry: m }))))).toEqual(["low", "high", undefined]);
    expect(nct.text(car({ nctExpiry: "2028-01" }))).toBe("Jan 2028");
  });
  it("0 km is unknown on every vehicle: never the best mileage, and no 0 km shown", () => {
    const km = row("Mileage");
    expect(rank([car({ mileageKm: 0 }), car({ mileageKm: 50000 })].map(km.number!))).toEqual([undefined, undefined]);
    expect(rank([car({ mileageKm: 0 }), car({ mileageKm: 50000 }), car({ mileageKm: 90000 })].map(km.number!))).toEqual([undefined, "low", "high"]);
    expect(km.text(car({ mileageKm: 0 }))).toBeUndefined();
    expect(km.number!(car({ condition: "commercial", owners: 0, mileageKm: 0 }))).toBeUndefined();
  });
  it("counts the equipment, more is better", () => {
    const eq = row("Equipment");
    expect(eq.text(car({ features: ["Sat Nav", "Bluetooth"] }))).toBe("2 items");
    expect(eq.text(car({}))).toBeUndefined();
    expect(eq.number!(car({ features: ["Sat Nav"] }))).toBe(1);
  });
});
