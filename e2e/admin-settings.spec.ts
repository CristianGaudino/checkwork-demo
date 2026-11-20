import { expect, test } from "@playwright/test";
import { as } from "./open";

test("a target is checked, saved, and changes what the overview calls late", async ({ page }) => {
  await page.goto("/dashboard/settings");
  await page.locator('input[name="leadSlaHours"]').fill("0");
  await page.locator("form").filter({ has: page.locator('input[name="leadSlaHours"]') }).getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("At least 1 hour")).toBeVisible();
  await page.locator('input[name="leadSlaHours"]').fill("2");
  await page.locator("form").filter({ has: page.locator('input[name="leadSlaHours"]') }).getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("New leads past your reply target")).toBeVisible();
});

test("a team member is added, shows in the lead owner choices, and cannot be added twice", async ({ page }) => {
  const name = `Tester ${Date.now() % 100000}`;
  await page.goto("/dashboard/settings?section=team");
  const add = page.locator("form").filter({ has: page.locator('input[name="email"]') });
  await add.locator('input[name="name"]').fill(name);
  await add.locator('input[name="email"]').fill("tester@example.com");
  await add.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("cell", { name })).toBeVisible();
  await add.locator('input[name="name"]').fill(name);
  await add.locator('input[name="email"]').fill("tester@example.com");
  await add.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("already on the team")).toBeVisible();
  await page.goto("/dashboard/leads");
  await page.getByRole("row").nth(1).getByRole("link").first().click();
  await expect(page.getByRole("region", { name: "Who has it" }).getByRole("button", { name })).toHaveCount(1);
});

test("the sections are one at a time; services say what is connected and how to ask for the rest, and the business details are shown", async ({ page }) => {
  await page.goto("/dashboard/settings");
  await expect(page.getByRole("main").getByText("Checkwork Motors").first()).toBeVisible(); // the business details, not the menu
  await expect(page.getByRole("region", { name: "Team" })).toHaveCount(0); // one section at a time
  await page.getByRole("navigation", { name: "Settings" }).getByRole("link", { name: "Services", exact: true }).click();
  await expect(page).toHaveURL(/section=services/);
  const social = page.getByRole("row", { name: /Facebook and Instagram posting/ });
  // The three outward services are simulated on the demo, so they read as connected; lead email shows its true state.
  await expect(social).toContainText("Connected");
  await expect(social).toContainText("@checkworkmotors");
  await expect(page.getByRole("row", { name: /Lead email/ })).toContainText("Ask us to connect it");
});

test("without the settings permission every section is read only: values as text, nothing to save", async ({ page, context }) => {
  await as(context, "Sales");
  for (const section of ["", "?section=team", "?section=emails", "?section=marketing", "?section=services"]) {
    await page.goto(`/dashboard/settings${section}`);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: /^(Save|Add|Send a test email|Start again)$/ })).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("textbox")).toHaveCount(0);
  }
  await page.goto("/dashboard/settings");
  await expect(page.getByText(/^\d+ hours$/)).toBeVisible(); // the reply target, as text (another test may have changed it)
});
