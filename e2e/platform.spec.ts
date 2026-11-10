import { expect, test } from "@playwright/test";

test("the platform lists dealerships with revenue, and a filter narrows them", async ({ page }) => {
  await page.goto("/platform");
  await expect(page.getByText("Monthly revenue")).toBeVisible();
  const all = (await page.getByRole("row").count()) - 1;
  expect(all).toBeGreaterThan(5);
  await page.getByRole("navigation", { name: "Filter" }).getByRole("link", { name: /^On trial/ }).click();
  await expect(page).toHaveURL(/status=trial/);
  await expect.poll(async () => (await page.getByRole("row").count()) - 1).toBeLessThan(all);
});

test("add a dealership, see it on a trial, change its plan and an add-on, and the audit log records each change", async ({ page }) => {
  const name = `E2E Motors ${Date.now() % 100000}`;
  await page.goto("/platform");
  const form = page.locator("form").filter({ has: page.locator('input[name="town"]') });
  await form.getByRole("button", { name: "Start a trial" }).click();
  await expect(page.getByText("Enter a name")).toBeVisible();
  await form.locator('input[name="name"]').fill(name);
  await form.locator('input[name="town"]').fill("Testtown");
  await form.locator('input[name="owner"]').fill("Pat Tester");
  await form.getByRole("button", { name: "Start a trial" }).click();
  await expect(page).toHaveURL(/\/platform\/dealerships\/d-/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByText("On trial").first()).toBeVisible();

  await page.locator('select[name="plan"]').selectOption("pro");
  await page.getByRole("button", { name: "Change plan" }).click();
  await expect(page.getByText("Pro").first()).toBeVisible();
  await page.getByRole("button", { name: "Social posting: off" }).click();
  await expect(page.getByRole("button", { name: "Social posting: on" })).toBeVisible();
  await page.getByRole("button", { name: "End trial and start billing" }).click();
  await expect(page.getByText("€388").first()).toBeVisible(); // Pro 349 + Social posting 39

  await page.goto("/platform/audit");
  for (const text of ["Changed plan to Pro", "Turned on the Social posting add-on", "Ended the trial and started billing"]) await expect(page.getByRole("row", { name: new RegExp(`${text}.*${name}`) })).toBeVisible();
});

test("a duplicate dealership name is refused", async ({ page }) => {
  await page.goto("/platform");
  const form = page.locator("form").filter({ has: page.locator('input[name="town"]') });
  await form.locator('input[name="name"]').fill("harbour motors");
  await form.locator('input[name="town"]').fill("Cork");
  await form.locator('input[name="owner"]').fill("Someone");
  await form.getByRole("button", { name: "Start a trial" }).click();
  await expect(page.getByText("already on the platform")).toBeVisible();
});

test("usage and billing: a due invoice can be marked paid, and leaves the Due list", async ({ page }) => {
  await page.goto("/platform/usage?status=due");
  const buttons = page.getByRole("button", { name: "Mark paid" });
  const before = await buttons.count();
  expect(before).toBeGreaterThan(1);
  await buttons.first().click();
  await expect(buttons).toHaveCount(before - 1);
});

test("plans, platform settings and a bad value", async ({ page }) => {
  await page.goto("/platform/plans");
  await expect(page.getByRole("region", { name: "Growth" })).toContainText("€199");
  await page.goto("/platform/settings");
  await page.locator('input[name="trialDays"]').fill("200");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("At most 90")).toBeVisible();
  await page.locator('input[name="trialDays"]').fill("21");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
});

test("an unknown dealership is a 404", async ({ page }) => {
  expect((await page.goto("/platform/dealerships/nope"))!.status()).toBe(404);
});
