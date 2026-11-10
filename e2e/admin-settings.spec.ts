import { expect, test } from "@playwright/test";

test("a target is checked, saved, and changes what the overview calls late", async ({ page }) => {
  await page.goto("/admin/settings");
  await page.locator('input[name="leadSlaHours"]').fill("0");
  await page.locator("form").filter({ has: page.locator('input[name="leadSlaHours"]') }).getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("At least 1 hour")).toBeVisible();
  await page.locator('input[name="leadSlaHours"]').fill("2");
  await page.locator("form").filter({ has: page.locator('input[name="leadSlaHours"]') }).getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByText("New leads past your reply target")).toBeVisible();
});

test("a team member is added, shows in the lead owner choices, and cannot be added twice", async ({ page }) => {
  const name = `Tester ${Date.now() % 100000}`;
  await page.goto("/admin/settings");
  const add = page.locator("form").filter({ has: page.locator('input[name="email"]') });
  await add.locator('input[name="name"]').fill(name);
  await add.locator('input[name="email"]').fill("tester@example.com");
  await add.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("cell", { name })).toBeVisible();
  await add.locator('input[name="name"]').fill(name);
  await add.locator('input[name="email"]').fill("tester@example.com");
  await add.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("already on the team")).toBeVisible();
  await page.goto("/admin/leads");
  await page.getByRole("row").nth(1).getByRole("link").first().click();
  await expect(page.locator('select[name="assignedTo"] option', { hasText: name })).toHaveCount(1);
});

test("connected services list what is still needed, and the business details are shown", async ({ page }) => {
  await page.goto("/admin/settings");
  const social = page.getByRole("row", { name: /Facebook and Instagram posting/ });
  await expect(social).toContainText("Not connected");
  await expect(social).toContainText("META_PAGE_ACCESS_TOKEN");
  await expect(page.getByText("Checkwork Motors").first()).toBeVisible();
});
