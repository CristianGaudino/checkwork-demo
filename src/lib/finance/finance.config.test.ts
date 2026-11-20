import { afterEach, expect, test, vi } from "vitest";
import { isProduction } from "@/lib/site";
import { FINANCE, financeNotice, pcpEstimate, pcpFinalEur } from "./finance.config";

afterEach(() => vi.unstubAllEnvs());

// D-16: placeholder figures must never go live. deploy.yml runs npm test with its job APP_ENV, so this fails the deploy
// once APP_ENV is production until the dealer's terms replace the placeholder.
const guard = (config: { placeholder: boolean }) => {
  if (isProduction()) expect(config.placeholder, "finance.config.ts still holds placeholder figures").toBe(false);
};

test("the live config is not a placeholder in production", () => {
  guard(FINANCE);
});

test("the guard fails a placeholder config in production and lets it through elsewhere", () => {
  vi.stubEnv("APP_ENV", "production");
  expect(() => guard({ placeholder: true })).toThrow();
  expect(() => guard({ placeholder: false })).not.toThrow();
  vi.stubEnv("APP_ENV", "demo");
  expect(() => guard({ placeholder: true })).not.toThrow();
});

test("the representative example is worked out on the car's own price, and on the default without one", () => {
  expect(FINANCE.notice).toContain("cash price €15,000.00, deposit €3,000.00, amount of credit €12,000.00");
  expect(financeNotice(17950)).toContain("cash price €17,950.00, deposit €3,000.00, amount of credit €14,950.00");
  expect(financeNotice(2500)).toContain("cash price €2,500.00, deposit €0.00, amount of credit €2,500.00");
  expect(financeNotice(999999)).toBe(FINANCE.notice); // a price the lender would not finance
});

test("the PCP example states its final payment, mileage and figures from the same sums as the calculator", () => {
  const pcp = FINANCE.pcp!;
  const final = pcpFinalEur(17950, pcp.termMonths)!;
  const q = pcpEstimate(17950, 3000, pcp.termMonths)!;
  expect(final).toBe(Math.round((17950 * pcp.gmfvPct[pcp.termMonths]) / 100) + pcp.purchaseFeeEur);
  const n = financeNotice(17950, "pcp");
  const money = (e: number) => `€${e.toLocaleString("en-IE", { minimumFractionDigits: 2 })}`;
  expect(n).toContain(`cash price €17,950.00, deposit €3,000.00, amount of credit €14,950.00, ${pcp.termMonths} monthly payments of ${money(q.monthlyEur)}, optional final payment ${money(final)}`);
  expect(n).toContain(`Total amount payable ${money(q.totalEur + 3000)}`);
  expect(n).toContain(`${pcp.kmPerYear.toLocaleString("en-IE")} km a year`);
  expect(n).toContain("Personal contract plan, subject to status.");
  expect(pcpFinalEur(17950, 60)).toBeUndefined(); // a term PCP does not offer
});
