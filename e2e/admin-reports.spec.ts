import { expect, test } from "@playwright/test";

// Reports: the whole dealership's for the margins roles, a salesperson's own (counts only) for sales. Prep costs on a car, margins only.
const as = (context: import("@playwright/test").BrowserContext, role: string) => context.addCookies([{ name: "checkwork-demo-role", value: role, url: "http://localhost:3000" }]);

test("owners, managers and finance see the full report with profit; the period filter narrows it", async ({ page, context }) => {
  for (const role of ["Owner", "Manager", "Finance"]) {
    await as(context, role);
    await page.goto("/dashboard/reports");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reports");
    await expect(page.getByText("Profit", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("region", { name: "By salesperson" })).toBeVisible();
  }
  await page.getByRole("navigation", { name: "Period" }).getByRole("link", { name: "3 months" }).click();
  await expect(page).toHaveURL(/period=3$/);
  await expect(page.getByRole("region", { name: "Sales by month" }).getByRole("table").last().getByRole("row")).toHaveCount(4); // a header and three months (the first table is the chart's, for screen readers)
  expect((await page.request.get("/dashboard/reports?period=7")).status()).toBe(200); // a bad period falls back
});

test("a salesperson sees only their own counts: no money, no one else", async ({ page, context }) => {
  await as(context, "Sales");
  await page.goto("/dashboard");
  await page.getByRole("navigation", { name: "Dealer dashboard" }).getByRole("link", { name: "Reports" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your report");
  await expect(page.getByText("Conor Doyle, the last 12 months")).toBeVisible();
  const main = page.locator("main");
  await expect(main).not.toContainText("€");
  await expect(main).not.toContainText("Profit");
  await expect(main).not.toContainText("Aoife");
});

test("prep costs: margins roles add and remove a line on a car, and it counts in its cost; sales never see them", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await as(context, "Finance");
  await page.goto("/dashboard/stock/4710005");
  const panel = page.getByRole("region", { name: "Prep costs" });
  await panel.getByText("Add a prep cost").click();
  await panel.getByLabel("For").click();
  await page.getByRole("listbox").getByRole("option", { name: "Bodywork" }).click();
  await panel.getByLabel("Amount (€)").fill("275");
  await panel.getByLabel("Note (optional)").fill(`Scratch ${Date.now()}`);
  await panel.getByRole("button", { name: "Add" }).click();
  const line = panel.getByRole("listitem").filter({ hasText: "Bodywork" }).filter({ hasText: "€275" }).last();
  await expect(line).toBeVisible();
  await line.getByRole("button", { name: /^Remove Bodywork/ }).click();
  await expect(panel.getByRole("listitem").filter({ hasText: "Bodywork" }).filter({ hasText: "€275" })).toHaveCount(0);
  await as(context, "Sales");
  await page.reload();
  await expect(page.getByRole("region", { name: "Prep costs" })).toHaveCount(0);
});
