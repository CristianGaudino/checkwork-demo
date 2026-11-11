import { expect, test } from "@playwright/test";

// The inbox shows made-up leads only (never the real lead table), filters through the URL, and a lead can be worked.
test("filters by status and search, and keeps the filter in the link", async ({ page }) => {
  await page.goto("/dashboard/leads");
  const rows = page.getByRole("row");
  const all = (await rows.count()) - 1;
  expect(all).toBeGreaterThan(10);
  await page.getByRole("link", { name: /^Won/ }).click();
  await expect(page).toHaveURL(/status=won/);
  const won = (await rows.count()) - 1;
  expect(won).toBeLessThan(all);
  await page.getByLabel("Search leads").fill("zzzz-nobody");
  await page.getByLabel("Search leads").press("Enter");
  await expect(page.getByText("No leads match")).toBeVisible();
  await expect(page).toHaveURL(/status=won/);
});

test("open a lead, change who has it and its status, add a note", async ({ page }) => {
  await page.goto("/dashboard/leads?status=new");
  await page.getByRole("row").nth(1).getByRole("link").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Contacted" }).click();
  await expect(page.getByRole("button", { name: "Contacted" })).toHaveAttribute("aria-pressed", "true");
  const person = page.getByRole("region", { name: "Who has it" }).getByRole("button").nth(1);
  await person.click();
  await expect(person).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Add a note").fill("Called, will visit on Saturday.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Called, will visit on Saturday.")).toBeVisible();
});

test("an unknown lead is a 404, and bad filters are ignored", async ({ page }) => {
  expect((await page.goto("/dashboard/leads/not-a-lead"))!.status()).toBe(404);
  await page.goto("/dashboard/leads?status=hacked&type=nope");
  expect((await page.getByRole("row").count()) - 1).toBeGreaterThan(10);
});
