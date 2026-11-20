import { FINANCE } from "@/lib/finance/finance.config";
import { financeable, quote } from "@/lib/finance/payment";
import { PRICING } from "./pricing.config";
import { fmtEur } from "./format";
import { isReduced, isSold, onRequest, type Car } from "./types";

export type PriceInfo = {
  headline: string; // "Sold", or the price as advertised
  vatLine?: string; // what the headline means: "Inc. VAT" or "Ex. VAT, reclaimable"
  incVat?: string; // under an ex. VAT price: the same price with VAT on, "€30,258 inc. VAT"
  was?: string; // the earlier price, struck through
  drop?: string; // "Reduced by €500": words, so colour is never the only sign
  financeFrom?: string; // "Estimate from €312 a month"
};

const withVat = (eur: number) => Math.round(eur * (1 + PRICING.vatRatePct / 100));

// What the buyer pays: an ex. VAT price with VAT on, anything else as advertised. Compare and finance work on this, never on priceEur.
export const payableEur = (car: Pick<Car, "priceEur" | "vat">) => (car.vat === "ex" ? withVat(car.priceEur) : car.priceEur);

// Pure: the one place that decides what a price says. A car with a VAT status always says it.
export function priceInfo(car: Pick<Car, "priceEur" | "wasPriceEur" | "vat" | "soldAt" | "reserved">): PriceInfo {
  const L = PRICING.labels;
  if (isSold(car)) return { headline: L.sold };
  if (onRequest(car)) return { headline: L.onRequest };
  const out: PriceInfo = { headline: fmtEur(car.priceEur) };
  if (car.vat === "inc") out.vatLine = L.vatInc;
  if (car.vat === "ex") {
    out.vatLine = L.vatEx;
    out.incVat = `${fmtEur(withVat(car.priceEur))} ${L.incVatSuffix}`;
  }
  if (isReduced(car)) {
    out.was = fmtEur(car.wasPriceEur!);
    out.drop = `${L.reduced} ${fmtEur(car.wasPriceEur! - car.priceEur)}`;
  }
  const monthly = financeMonthlyEur(car);
  if (monthly !== undefined) out.financeFrom = `${L.financeFrom} ${fmtEur(monthly)} ${L.perMonth}`;
  return out;
}

// The estimated monthly payment, in whole euro, or none for a car with no finance offer. Finance is worked out on what the buyer pays, so an
// ex. VAT price is taken with VAT on. A sold or reserved car has no finance offer, as on the rest of its page. The deposit is the
// calculator's own default (none on a car cheaper than it), so the two agree.
export function financeMonthlyEur(car: Pick<Car, "priceEur" | "vat" | "soldAt" | "reserved">): number | undefined {
  const payable = payableEur(car);
  if (isSold(car) || onRequest(car) || car.reserved || !financeable(payable)) return undefined;
  const { defaults } = FINANCE;
  const q = quote(payable, payable > defaults.depositEur ? defaults.depositEur : 0, defaults.termMonths, defaults.aprPct);
  return q ? Math.round(q.monthlyEur) : undefined;
}
