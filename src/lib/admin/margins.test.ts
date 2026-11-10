import { describe, expect, it } from "vitest";
import { demoCost, marginOf, parseCost } from "./margins";

describe("marginOf", () => {
  it("is the price less the cost, and the share of the price", () => {
    expect(marginOf(10_000, 8_500)).toEqual({ eur: 1_500, pct: 15 });
  });
  it("can be negative, and never divides by zero", () => {
    expect(marginOf(9_000, 9_500).eur).toBe(-500);
    expect(marginOf(0, 0)).toEqual({ eur: 0, pct: 0 });
  });
});

describe("demoCost", () => {
  it("is 80 to 90 percent of the price, to 50 euro, and the same each time", () => {
    for (const id of ["4710001", "4710002", "5100006"]) {
      const c = demoCost(id, 20_000);
      expect(c).toBeGreaterThanOrEqual(16_000);
      expect(c).toBeLessThanOrEqual(18_050);
      expect(c % 50).toBe(0);
      expect(demoCost(id, 20_000)).toBe(c);
    }
  });
});

describe("parseCost", () => {
  it("reads a good figure, rounds it, and treats blank as no cost", () => {
    expect(parseCost("12500")).toBe(12500);
    expect(parseCost(" 12500.6 ")).toBe(12501);
    expect(parseCost("0")).toBe(0);
    expect(parseCost("")).toBeNull();
    expect(parseCost("   ")).toBeNull();
  });
  it("refuses anything that is not a sensible amount", () => {
    for (const bad of ["abc", "-1", "1e999", "NaN", "Infinity", "1000001", "12,500", "€500"]) expect(parseCost(bad), bad).toBe("invalid");
  });
});
