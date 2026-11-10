import { expect, test } from "@playwright/test";

// Margins and cost prices are behind a permission. In this run the demo bar is on, so its switch (a cookie) is what grants it.
const grant = (context: import("@playwright/test").BrowserContext) => context.addCookies([{ name: "checkwork-demo-perms", value: "margins", url: "http://localhost:3000" }]);

test("without the permission there is no Margins screen, no margin column or stat, and no cost box", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("navigation", { name: "Dealer admin" }).getByRole("link", { name: "Margins" })).toHaveCount(0);
  await expect(page.getByText("Stock margin")).toHaveCount(0);
  expect((await page.request.get("/admin/margins")).status()).toBe(404);
  await page.goto("/admin/stock");
  await expect(page.getByRole("columnheader", { name: "Margin" })).toHaveCount(0);
  await page.goto("/admin/stock/new");
  await expect(page.getByLabel("Cost price (€)")).toHaveCount(0);
});

test("with the permission the Margins screen, the column, the stat and the cost box appear", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); // the margin columns are from 768px
  await grant(context);
  await page.goto("/admin");
  await expect(page.getByText("Stock margin")).toBeVisible();
  await page.getByRole("navigation", { name: "Dealer admin" }).getByRole("link", { name: "Margins", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Margins");
  await expect(page.getByRole("row").nth(1)).toContainText("€");
  await page.goto("/admin/stock");
  await expect(page.getByRole("columnheader", { name: "Margin" }).first()).toBeVisible();
  await page.goto("/admin/stock/new");
  await expect(page.getByLabel("Cost price (€)")).toBeVisible();
});

test("the demo bar's Margins switch turns the permission on and off", async ({ page }) => {
  await page.goto("/");
  const bar = page.locator("[data-demo-bar]");
  await expect(bar.getByRole("button", { name: /^Margins/ })).toHaveCount(0); // only when viewing as the dealer
  await bar.getByRole("link", { name: "Dealer" }).click();
  const sw = bar.getByRole("button", { name: "Margins off" });
  await expect(sw).toHaveAttribute("aria-pressed", "false");
  await sw.click();
  await expect(bar.getByRole("button", { name: "Margins on" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/admin");
  await expect(page.getByRole("navigation", { name: "Dealer admin" }).getByRole("link", { name: "Margins", exact: true })).toBeVisible();
  await bar.getByRole("button", { name: "Margins on" }).click();
  await expect(page.getByRole("navigation", { name: "Dealer admin" }).getByRole("link", { name: "Margins", exact: true })).toHaveCount(0);
});

test("a bad cost stops the save and says why", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await grant(context);
  await page.goto("/admin/stock/new");
  await page.getByLabel("Make", { exact: true }).fill("Skoda");
  await page.getByLabel("Model", { exact: true }).fill("Octavia");
  await page.getByLabel("Year", { exact: true }).fill("2021");
  await page.getByLabel("Price (€)", { exact: true }).fill("19950");
  await page.getByLabel("Cost price (€)").fill("-5");
  await page.getByRole("button", { name: "Add car" }).click();
  await expect(page.getByText("Enter the cost in whole euros")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/stock\/new$/); // not saved, so nothing was added to the stock
});
