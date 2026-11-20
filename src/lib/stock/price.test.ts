import { describe, expect, it } from "vitest";
import { FINANCE } from "@/lib/finance/finance.config";
import { quote } from "@/lib/finance/payment";
import { financeMonthlyEur, payableEur, priceInfo } from "./price";

describe("priceInfo", () => {
  it("says only the price and a finance estimate for a plain car", () => {
    const p = priceInfo({ priceEur: 15000 });
    expect(p.headline).toBe("€15,000");
    expect(p.vatLine).toBeUndefined();
    expect(p.was).toBeUndefined();
    expect(p.financeFrom).toMatch(/^Estimate from €\d+ a month$/);
  });
  it("says Price on request and nothing else for a price of 0, an earlier price included", () => {
    expect(priceInfo({ priceEur: 0, wasPriceEur: 15000, vat: "inc" })).toEqual({ headline: "Price on request" });
  });
  it("says Sold and nothing else for a sold car", () => {
    expect(priceInfo({ priceEur: 15000, soldAt: "2026-10-01" })).toEqual({ headline: "Sold" });
  });
  it("names the VAT status, and gives the inc. VAT figure under an ex. VAT price", () => {
    expect(priceInfo({ priceEur: 20000, vat: "inc" }).vatLine).toBe("Inc. VAT");
    const ex = priceInfo({ priceEur: 20000, vat: "ex" });
    expect(ex.vatLine).toBe("Ex. VAT, reclaimable");
    expect(ex.incVat).toBe("€24,600 inc. VAT");
  });
  it("works finance out on the VAT-inclusive price", () => {
    expect(priceInfo({ priceEur: 20000, vat: "ex" }).financeFrom).toBe(priceInfo({ priceEur: 24600 }).financeFrom);
  });
  it("uses the calculator's default deposit, so the line under the price and the calculator agree", () => {
    const { defaults } = FINANCE;
    const monthly = (price: number, deposit: number) => `€${Math.round(quote(price, deposit, defaults.termMonths, defaults.aprPct)!.monthlyEur)}`;
    expect(priceInfo({ priceEur: 18000 }).financeFrom).toContain(monthly(18000, defaults.depositEur));
    expect(priceInfo({ priceEur: 2500 }).financeFrom).toContain(monthly(2500, 0));
  });
  it("shows a drop in words, and ignores a was price that is not higher", () => {
    const p = priceInfo({ priceEur: 14500, wasPriceEur: 15000 });
    expect(p.was).toBe("€15,000");
    expect(p.drop).toBe("Reduced by €500");
    expect(priceInfo({ priceEur: 15000, wasPriceEur: 15000 }).drop).toBeUndefined();
    expect(priceInfo({ priceEur: 15000, wasPriceEur: 12000 }).was).toBeUndefined();
  });
  it("gives the payable price: VAT on for ex. VAT, as advertised otherwise", () => {
    expect(payableEur({ priceEur: 20000, vat: "ex" })).toBe(24600);
    expect(payableEur({ priceEur: 20000, vat: "inc" })).toBe(20000);
    expect(payableEur({ priceEur: 20000 })).toBe(20000);
  });
  it("leaves out finance for a price outside what finance covers", () => {
    expect(priceInfo({ priceEur: 500 }).financeFrom).toBeUndefined();
    expect(priceInfo({ priceEur: 300000 }).financeFrom).toBeUndefined();
  });
  it("offers no finance on a reserved car, as the rest of its page does not", () => {
    expect(priceInfo({ priceEur: 20000, reserved: true }).financeFrom).toBeUndefined();
    expect(priceInfo({ priceEur: 20000, reserved: true }).headline).toBe("€20,000");
  });
});

describe("financeMonthlyEur", () => {
  it("is the figure the price block says, and none where there is no finance offer", () => {
    const m = financeMonthlyEur({ priceEur: 15000 });
    expect(priceInfo({ priceEur: 15000 }).financeFrom).toBe(`Estimate from €${m} a month`);
    const { depositEur, termMonths, aprPct } = FINANCE.defaults;
    expect(m).toBe(Math.round(quote(15000, depositEur, termMonths, aprPct)!.monthlyEur));
    for (const car of [{ priceEur: 0 }, { priceEur: 15000, soldAt: "2026-10-01" }, { priceEur: 15000, reserved: true }, { priceEur: 500 }]) expect(financeMonthlyEur(car)).toBeUndefined();
  });
});
