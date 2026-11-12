import { describe, expect, it } from "vitest";
import type { Car } from "@/lib/stock/types";
import { parseStockList, stockList } from "./stock-views";

const car = (id: string, o: Partial<Car> = {}) => ({ id, slug: `car-${id}`, make: "Ford", makeSlug: "ford", model: "Focus", modelSlug: "focus", year: 2020, priceEur: 10000, photos: [], fuel: "petrol", gearbox: "manual", ...o }) as Car;

describe("the stock list", () => {
  it("reads the view (or its old name) and the filters, and drops what it does not know", () => {
    expect(parseStockList({})).toMatchObject({ view: "for-sale", q: "", make: undefined, fuel: undefined, gearbox: undefined });
    expect(parseStockList({ status: "sold" }).view).toBe("sold");
    expect(parseStockList({ view: "nope" }).view).toBe("for-sale");
    expect(parseStockList({ view: "toString" }).view).toBe("for-sale"); // never a property of the object itself
    expect(parseStockList({ q: "  FoCus  ", gearbox: "automatic" })).toMatchObject({ q: "focus", gearbox: "automatic" });
    expect(parseStockList({ q: "x".repeat(200) }).q).toHaveLength(60);
  });
  it("filters by search, make, fuel and gearbox, newest first", () => {
    const all = [car("1"), car("2", { gearbox: "automatic" }), car("3", { make: "Kia", makeSlug: "kia", model: "Niro", fuel: "hybrid" })];
    expect(stockList(all, "all", "").map((c) => c.id)).toEqual(["3", "2", "1"]);
    expect(stockList(all, "all", "niro").map((c) => c.id)).toEqual(["3"]);
    expect(stockList(all, "all", "", { make: "ford" }).map((c) => c.id)).toEqual(["2", "1"]);
    expect(stockList(all, "all", "", { fuel: "hybrid" }).map((c) => c.id)).toEqual(["3"]);
    expect(stockList(all, "all", "", { gearbox: "automatic" }).map((c) => c.id)).toEqual(["2"]);
    expect(stockList(all, "all", "", { make: "nope" })).toEqual([]);
  });
  it("each view picks the cars it names", () => {
    const old = "2020-01-01";
    const all = [
      car("1", { photos: Array(6).fill({ src: "x" }) }),
      car("2", { wasPriceEur: 12000 }),
      car("3", { listedAt: old }),
      car("4", { reserved: true }),
      car("5", { listing: "hidden" }),
      car("6", { listing: "draft" }),
    ];
    const ids = (v: Parameters<typeof stockList>[1]) => stockList(all, v, "").map((c) => c.id);
    expect(ids("reduced")).toEqual(["2"]);
    expect(ids("photos")).not.toContain("1");
    expect(ids("old")).toEqual(["3"]);
    expect(ids("reserved")).toEqual(["4"]);
    expect(ids("hidden")).toEqual(["5"]);
    expect(ids("drafts")).toEqual(["6"]);
  });
  it("keeps sold cars out of For sale and in Sold", () => {
    const all = [car("1"), car("2", { soldAt: "2026-01-01" })];
    expect(stockList(all, "for-sale", "").map((c) => c.id)).toEqual(["1"]);
    expect(stockList(all, "sold", "").map((c) => c.id)).toEqual(["2"]);
  });
});
