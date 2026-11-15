import { afterEach, expect, test, vi } from "vitest";
import { isProduction } from "@/lib/site";
import { FINANCE, financeNotice } from "./finance.config";

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
