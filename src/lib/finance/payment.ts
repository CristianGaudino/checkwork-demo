// The one repayment formula, one payment a month. Pure, so it runs in the browser. The APR is an annual rate (Consumer Credit Act):
// the monthly rate is the one that compounds to it over 12 months, so 8.9% APR costs 8.9% a year, not the 9.27% that APR / 12 gives.
export type Quote = { monthlyEur: number; borrowedEur: number; totalEur: number; interestEur: number };
// PCP adds the optional final payment; its totalEur counts it, so the totals read the same way as hire purchase.
export type PcpQuote = Quote & { finalEur: number };
// The prices the calculator works with; the car page leaves out its Finance section for a car outside them.
export const financeable = (priceEur: number) => priceEur >= 1000 && priceEur <= 250000;
const monthlyRate = (aprPct: number) => Math.pow(1 + aprPct / 100, 1 / 12) - 1;

// Integer cents throughout: the monthly figure is rounded once and the total and interest come from it, so they agree.
// null for anything invalid, so the page shows "Check the figures you entered." and never NaN.
export function quote(priceEur: number, depositEur: number, termMonths: number, aprPct: number): Quote | null {
  const borrowed = priceEur - depositEur;
  if (!financeable(priceEur) ||!(depositEur >= 0) || !(borrowed > 0) || !(aprPct >= 0 && aprPct <= 30) || !Number.isInteger(termMonths) || termMonths < 1) return null;
  const r = monthlyRate(aprPct);
  const P = Math.round(borrowed * 100);
  const monthlyC = Math.round(r === 0 ? P / termMonths : (P * r) / (1 - Math.pow(1 + r, -termMonths)));
  const totalC = monthlyC * termMonths;
  return { monthlyEur: monthlyC / 100, borrowedEur: P / 100, totalEur: totalC / 100, interestEur: (totalC - P) / 100 };
}

// PCP: the same loan, amortised down to the final payment, which falls due with the last monthly payment. Every payment is discounted
// at the stated APR, so the APR it states is the APR it charges. null as quote() is, and when the final payment is not less than the
// amount borrowed (a deposit too big for PCP).
export function pcpQuote(priceEur: number, depositEur: number, termMonths: number, aprPct: number, finalEur: number): PcpQuote | null {
  const base = quote(priceEur, depositEur, termMonths, aprPct);
  const B = Math.round(finalEur * 100);
  if (!base || !(B > 0)) return null;
  const P = Math.round(base.borrowedEur * 100);
  if (B >= P) return null;
  const r = monthlyRate(aprPct);
  const v = Math.pow(1 + r, -termMonths);
  const monthlyC = Math.round(r === 0 ? (P - B) / termMonths : ((P - B * v) * r) / (1 - v));
  const totalC = monthlyC * termMonths + B;
  return { monthlyEur: monthlyC / 100, borrowedEur: P / 100, finalEur: B / 100, totalEur: totalC / 100, interestEur: (totalC - P) / 100 };
}
