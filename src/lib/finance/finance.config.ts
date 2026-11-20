import { SITE_NAME } from "@/lib/site";
import { pcpQuote, quote } from "./payment";

// The demo's own terms (#15): a made-up dealer, so the owner chose a representative 8.9% APR and the wording follows the usual Irish
// form (representative example, the arrears warning, hire purchase ownership, credit intermediary). A client site replaces all of it,
// and adds their own regulatory line (for example "regulated by the Central Bank of Ireland"), which a made-up dealer cannot claim.
// finance.config.test.ts fails a production deploy while placeholder is true.
const defaults = { priceEur: 15000, depositEur: 3000, termMonths: 48, aprPct: 8.9 };

// PCP (personal contract plan), optional per dealer: set `pcp` in FINANCE below to null and the site offers hire purchase only, as before.
// These are the demo's own figures, made up like the HP ones above. A real site must take every one of them from its lender: the APR,
// the terms, the guaranteed minimum future value (GMFV, the optional final payment), the mileage allowance, the excess mileage charge,
// any fee, and the lender's own PCP wording in financeNotice.
const pcpTerms = {
  placeholder: true, // made-up terms: finance.config.test.ts fails a production deploy until the lender's replace them, or `pcp` is null
  aprPct: 8.9,
  terms: [24, 36, 48] as readonly number[],
  termMonths: 36, // the representative example's term, and where the calculator starts
  // shortcut: one GMFV per term, as a share of the cash price; a lender sets it per car (age, mileage, model), so a real site takes its table.
  gmfvPct: { 24: 50, 36: 42, 48: 35 } as Record<number, number>,
  kmPerYear: 15000, // the mileage allowance
  excessCentPerKm: 10, // charged for each km over the allowance if the car is handed back
  purchaseFeeEur: 0, // an option to purchase fee, paid with the final payment; none here
};

const eur = (n: number) => `€${n.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export type FinanceProduct = "hp" | "pcp";
export const PRODUCT_LABELS: Record<FinanceProduct, string> = { hp: "Hire purchase", pcp: "PCP" };

// The optional final payment on a car: its GMFV for the term, in whole euro, plus any purchase fee. Undefined for a term the lender
// does not offer.
export function pcpFinalEur(priceEur: number, termMonths: number): number | undefined {
  const pct = pcpTerms.gmfvPct[termMonths];
  return pct === undefined ? undefined : Math.round((priceEur * pct) / 100) + pcpTerms.purchaseFeeEur;
}
// A PCP estimate on the dealer's terms.
export function pcpEstimate(priceEur: number, depositEur: number, termMonths: number) {
  const finalEur = pcpFinalEur(priceEur, termMonths);
  return finalEur === undefined ? null : pcpQuote(priceEur, depositEur, termMonths, pcpTerms.aprPct, finalEur);
}

const ESTIMATE = "This is an estimate only, not an approval or an offer of credit.";
const WARNINGS =
  `${SITE_NAME} acts as a credit intermediary, not a lender. Warning: You will not own the goods until the final payment is made. Warning: If you do not meet the ` +
  `repayments on your credit agreement, your account will go into arrears. This may affect your credit rating, which may limit your ` +
  `ability to access credit in the future.`;

// The required wording, with its representative example worked out on a cash price: a car page passes its own price, so the example
// matches the car beside it; everywhere else it is the default. The deposit and term are the defaults (no deposit on a car cheaper
// than the default deposit, as the calculator starts), and a price the lender would not finance falls back to the default example.
export function financeNotice(priceEur: number = defaults.priceEur, product: FinanceProduct = "hp"): string {
  const depositEur = priceEur > defaults.depositEur ? defaults.depositEur : 0;
  if (product === "pcp") {
    const n = pcpTerms.termMonths;
    // A cheap car can leave less to borrow than its final payment: its example is then without a deposit, still on its own price.
    const deposit = pcpEstimate(priceEur, depositEur, n) ? depositEur : 0;
    const q = pcpEstimate(priceEur, deposit, n);
    if (!q) return financeNotice(defaults.priceEur, "pcp");
    return (
      `${ESTIMATE} Representative example: cash price ${eur(priceEur)}, deposit ${eur(deposit)}, amount of credit ${eur(q.borrowedEur)}, ` +
      `${n} monthly payments of ${eur(q.monthlyEur)}, optional final payment ${eur(q.finalEur)}${pcpTerms.purchaseFeeEur ? ` (including a purchase fee of ${eur(pcpTerms.purchaseFeeEur)})` : ""}, ` +
      `${pcpTerms.aprPct}% APR. Total cost of credit ${eur(q.interestEur)}. Total amount payable ${eur(q.totalEur + deposit)}. ` +
      `Personal contract plan, subject to status. At the end you can pay the optional final payment and keep the car, hand it back, or trade it in. ` +
      `Mileage allowance ${pcpTerms.kmPerYear.toLocaleString("en-IE")} km a year: if you hand the car back, ${pcpTerms.excessCentPerKm} cent is charged for ` +
      `each km over it, and for damage beyond fair wear and tear. ${WARNINGS}`
    );
  }
  const q = quote(priceEur, depositEur, defaults.termMonths, defaults.aprPct);
  if (!q) return financeNotice();
  return (
    `${ESTIMATE} Representative example: cash price ${eur(priceEur)}, deposit ${eur(depositEur)}, amount of credit ${eur(q.borrowedEur)}, ` +
    `${defaults.termMonths} monthly payments of ${eur(q.monthlyEur)}, ${defaults.aprPct}% APR. Total cost of credit ${eur(q.interestEur)}. ` +
    `Total amount payable ${eur(q.totalEur + depositEur)}. Hire purchase, subject to status. ${WARNINGS}`
  );
}

export const FINANCE: {
  placeholder: boolean;
  defaults: { priceEur: number; depositEur: number; termMonths: number; aprPct: number };
  terms: readonly number[];
  notice: string;
  pcp: typeof pcpTerms | null; // null: hire purchase only
} = {
  placeholder: false,
  defaults,
  terms: [12, 24, 36, 48, 60],
  notice: financeNotice(),
  pcp: pcpTerms,
};
