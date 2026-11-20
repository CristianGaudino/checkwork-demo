import { describe, expect, it } from "vitest";
import { pcpQuote, quote } from "./payment";

// The monthly rate compounds to the APR over a year.
describe("quote", () => {
  it("gives 303.50 for 10,000 at 6% APR over 36 months", () => {
    expect(quote(10000, 0, 36, 6)?.monthlyEur).toBe(303.5);
  });

  it("derives total and interest from the rounded monthly figure", () => {
    expect(quote(20000, 0, 48, 7.9)).toEqual({ monthlyEur: 484.77, borrowedEur: 20000, totalEur: 23268.96, interestEur: 3268.96 });
  });

  it("divides by the term at 0% APR", () => {
    expect(quote(15000, 3000, 48, 0)).toEqual({ monthlyEur: 250, borrowedEur: 12000, totalEur: 12000, interestEur: 0 });
  });

  it("gives 314.86 for 15,000 at 9.9% APR over 60 months", () => {
    expect(quote(15000, 0, 60, 9.9)?.monthlyEur).toBe(314.86);
  });

  // The APR the payments really cost, found by bisection: what the representative example states must be what it charges.
  it("charges the APR it states", () => {
    const { monthlyEur } = quote(15000, 3000, 48, 8.9)!;
    let lo = 0, hi = 1;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const r = Math.pow(1 + mid, 1 / 12) - 1;
      const pv = (monthlyEur * (1 - Math.pow(1 + r, -48))) / r;
      if (pv > 12000) lo = mid; else hi = mid;
    }
    expect(lo * 100).toBeCloseTo(8.9, 1);
  });

  it.each([
    ["deposit equal to the price", 15000, 15000, 48, 9.9],
    ["deposit above the price", 15000, 16000, 48, 9.9],
    ["a negative deposit", 15000, -1, 48, 9.9],
    ["APR 31", 15000, 0, 48, 31],
    ["a negative APR", 15000, 0, 48, -1],
    ["price 999", 999, 0, 48, 9.9],
    ["price 250,001", 250001, 0, 48, 9.9],
    ["term 0", 15000, 0, 0, 9.9],
    ["a part month", 15000, 0, 12.5, 9.9],
    ["NaN APR", 15000, 0, 48, NaN],
    ["NaN deposit", 15000, NaN, 48, 9.9],
  ])("is null for %s", (_, price, deposit, term, apr) => {
    expect(quote(price, deposit, term, apr)).toBeNull();
  });

  it("takes the range edges", () => {
    expect(quote(1000, 0, 12, 0)?.monthlyEur).toBe(83.33);
    expect(quote(250000, 0, 60, 30)).not.toBeNull();
  });
});

describe("pcpQuote", () => {
  // Worked by hand. 12.682503% APR is 1% a month exactly (1.01^12 = 1.12682503). Borrow 12,000 (15,000 less 3,000), final payment 6,000
  // with the 36th monthly payment. 1.01^36 = 1.43076878, so v = 1 / 1.43076878 = 0.69892495, and the final payment is worth
  // 6,000 x v = 4,193.55 today. The monthly payments repay the rest: (12,000 - 4,193.55) x 0.01 / (1 - v) = 7,806.45 x 0.03321431 = 259.29.
  // Total you repay: 36 x 259.29 + 6,000 = 15,334.44, so the interest is 3,334.44.
  it("amortises the amount borrowed down to the final payment", () => {
    expect(pcpQuote(15000, 3000, 36, (Math.pow(1.01, 12) - 1) * 100, 6000)).toEqual({ monthlyEur: 259.29, borrowedEur: 12000, finalEur: 6000, totalEur: 15334.44, interestEur: 3334.44 });
  });

  it("divides what is left after the final payment by the term at 0% APR", () => {
    expect(pcpQuote(15000, 3000, 36, 0, 6000)).toEqual({ monthlyEur: 166.67, borrowedEur: 12000, finalEur: 6000, totalEur: 12000.12, interestEur: 0.12 });
  });

  it("charges the APR it states, final payment included", () => {
    const { monthlyEur } = pcpQuote(15000, 3000, 36, 8.9, 6300)!;
    let lo = 0, hi = 1;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const r = Math.pow(1 + mid, 1 / 12) - 1;
      const pv = (monthlyEur * (1 - Math.pow(1 + r, -36))) / r + 6300 * Math.pow(1 + r, -36);
      if (pv > 12000) lo = mid; else hi = mid;
    }
    expect(lo * 100).toBeCloseTo(8.9, 1);
  });

  it("is null when the final payment is not less than the amount borrowed, or the loan itself is invalid", () => {
    expect(pcpQuote(15000, 9000, 36, 8.9, 6000)).toBeNull();
    expect(pcpQuote(15000, 3000, 36, 8.9, 0)).toBeNull();
    expect(pcpQuote(999, 0, 36, 8.9, 100)).toBeNull();
  });
});
