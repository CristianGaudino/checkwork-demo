// The one repayment formula, one payment a month. Pure, so it runs in the browser. The APR is an annual rate (Consumer Credit Act):
// the monthly rate is the one that compounds to it over 12 months, so 8.9% APR costs 8.9% a year, not the 9.27% that APR / 12 gives.
export type Quote = { monthlyEur: number; borrowedEur: number; totalEur: number; interestEur: number };
// The prices the calculator works with; the car page leaves out its Finance section for a car outside them.
export const financeable = (priceEur: number) => priceEur >= 1000 && priceEur <= 250000;

// Integer cents throughout: the monthly figure is rounded once and the total and interest come from it, so they agree.
// null for anything invalid, so the page shows "Check the figures you entered." and never NaN.
export function quote(priceEur: number, depositEur: number, termMonths: number, aprPct: number): Quote | null {
  const borrowed = priceEur - depositEur;
  if (!financeable(priceEur) ||!(depositEur >= 0) || !(borrowed > 0) || !(aprPct >= 0 && aprPct <= 30) || !Number.isInteger(termMonths) || termMonths < 1) return null;
  const r = Math.pow(1 + aprPct / 100, 1 / 12) - 1;
  const P = Math.round(borrowed * 100);
  const monthlyC = Math.round(r === 0 ? P / termMonths : (P * r) / (1 - Math.pow(1 + r, -termMonths)));
  const totalC = monthlyC * termMonths;
  return { monthlyEur: monthlyC / 100, borrowedEur: P / 100, totalEur: totalC / 100, interestEur: (totalC - P) / 100 };
}
