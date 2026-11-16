import { FINANCE } from "@/lib/finance/finance.config";
import { financeable, quote } from "@/lib/finance/payment";
import { PRICING } from "./pricing.config";
import { formatPrice } from "./format";
import { isSold, type Car } from "./types";

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
  const out: PriceInfo = { headline: formatPrice(car.priceEur) };
  if (car.vat === "inc") out.vatLine = L.vatInc;
  if (car.vat === "ex") {
    out.vatLine = L.vatEx;
    out.incVat = `${formatPrice(withVat(car.priceEur))} ${L.incVatSuffix}`;
  }
  if (car.wasPriceEur !== undefined && car.wasPriceEur > car.priceEur) {
    out.was = formatPrice(car.wasPriceEur);
    out.drop = `${L.reduced} ${formatPrice(car.wasPriceEur - car.priceEur)}`;
  }
  // Finance is worked out on what the buyer pays, so an ex. VAT price is taken with VAT on. A reserved car has no finance offer, as on the
  // rest of its page: a deposit is on it. The deposit is the calculator's own default (none on a car cheaper than it), so the two agree.
  const payable = payableEur(car);
  if (financeable(payable) && !car.reserved) {
    const { defaults } = FINANCE;
    const q = quote(payable, payable > defaults.depositEur ? defaults.depositEur : 0, defaults.termMonths, defaults.aprPct);
    if (q) out.financeFrom = `${L.financeFrom} ${formatPrice(Math.round(q.monthlyEur))} ${L.perMonth}`;
  }
  return out;
}
