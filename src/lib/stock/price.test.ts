import { describe, expect, it } from "vitest";
import { payableEur, priceInfo } from "./price";

describe("priceInfo", () => {
  it("says only the price and a finance estimate for a plain car", () => {
    const p = priceInfo({ priceEur: 15000 });
    expect(p.headline).toBe("€15,000");
    expect(p.vatLine).toBeUndefined();
    expect(p.was).toBeUndefined();
    expect(p.financeFrom).toMatch(/^Estimate from €\d+ a month$/);
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
});
