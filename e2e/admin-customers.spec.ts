import { expect, test } from "@playwright/test";

test("customers, stock alerts and newsletter each have a table, and an alert can be paused", async ({ page }) => {
  await page.goto("/dashboard/customers");
  expect((await page.getByRole("row").count()) - 1).toBeGreaterThan(5);
  await page.getByRole("link", { name: "Stock alerts" }).click();
  const active = page.getByRole("row").filter({ hasText: "Active" }).first();
  await active.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("link", { name: "Stock alerts" })).toHaveAttribute("aria-current", "true");
  const paused = page.getByRole("row").filter({ hasText: "Paused" }).first();
  await expect(paused).toBeVisible();
  // Consent only goes one way: staff can stop an alert or the newsletter, never start one again for the person.
  await expect(paused.getByRole("button", { name: "Pause" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Resume|Turn on/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Newsletter" }).click();
  await expect(page.getByRole("button", { name: "Unsubscribe" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^(Resubscribe|Subscribe|Subscribe again)$/ })).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: "Unsubscribed" }).first().getByRole("button")).toHaveCount(0);
});
