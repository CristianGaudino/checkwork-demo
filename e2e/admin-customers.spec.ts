import { expect, test } from "@playwright/test";

test("customers, stock alerts and newsletter each have a table, and an alert can be paused", async ({ page }) => {
  await page.goto("/admin/customers");
  expect((await page.getByRole("row").count()) - 1).toBeGreaterThan(5);
  await page.getByRole("link", { name: "Stock alerts" }).click();
  const active = page.getByRole("row").filter({ hasText: "Active" }).first();
  await active.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("link", { name: "Stock alerts" })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("row").filter({ hasText: "Paused" }).first()).toBeVisible();
  await page.getByRole("link", { name: "Newsletter" }).click();
  await expect(page.getByRole("button", { name: "Unsubscribe" }).first()).toBeVisible();
});
