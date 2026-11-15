import { SITE_NAME } from "@/lib/site";
import { quote } from "./payment";

// The demo's own terms (#15): a made-up dealer, so the owner chose a representative 8.9% APR and the wording follows the usual Irish
// form (representative example, the arrears warning, hire purchase ownership, credit intermediary). A client site replaces all of it,
// and adds their own regulatory line (for example "regulated by the Central Bank of Ireland"), which a made-up dealer cannot claim.
// finance.config.test.ts fails a production deploy while placeholder is true.
const defaults = { priceEur: 15000, depositEur: 3000, termMonths: 48, aprPct: 8.9 };
const eur = (n: number) => `€${n.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// The required wording, with its representative example worked out on a cash price: a car page passes its own price, so the example
// matches the car beside it; everywhere else it is the default. The deposit and term are the defaults (no deposit on a car cheaper
// than the default deposit, as the calculator starts), and a price the lender would not finance falls back to the default example.
export function financeNotice(priceEur: number = defaults.priceEur): string {
  const depositEur = priceEur > defaults.depositEur ? defaults.depositEur : 0;
  const q = quote(priceEur, depositEur, defaults.termMonths, defaults.aprPct);
  if (!q) return financeNotice();
  return (
    `This is an estimate only, not an approval or an offer of credit. Representative example: cash price ${eur(priceEur)}, deposit ${eur(depositEur)}, amount of credit ${eur(q.borrowedEur)}, ` +
    `${defaults.termMonths} monthly payments of ${eur(q.monthlyEur)}, ${defaults.aprPct}% APR. Total cost of credit ${eur(q.interestEur)}. ` +
    `Total amount payable ${eur(q.totalEur + depositEur)}. Hire purchase, subject to status. ${SITE_NAME} acts as a credit ` +
    `intermediary, not a lender. Warning: You will not own the goods until the final payment is made. Warning: If you do not meet the ` +
    `repayments on your credit agreement, your account will go into arrears. This may affect your credit rating, which may limit your ` +
    `ability to access credit in the future.`
  );
}

export const FINANCE: {
  placeholder: boolean;
  defaults: { priceEur: number; depositEur: number; termMonths: number; aprPct: number };
  terms: readonly number[];
  notice: string;
} = {
  placeholder: false,
  defaults,
  terms: [12, 24, 36, 48, 60],
  notice: financeNotice(),
};
