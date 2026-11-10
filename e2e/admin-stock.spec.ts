import { expect, test } from "@playwright/test";

// The dealer adds, edits, sells and deletes a car, and the public site follows. One made-up make, so no other test sees it, and it is
// deleted at the end whatever happens.
const MAKE = "Zztest";

test.afterEach(async ({ page }) => {
  await page.goto("/admin/stock?status=all&q=" + MAKE);
  const row = page.getByRole("row", { name: new RegExp(MAKE) });
  while ((await row.count()) > 0) {
    await page.getByText("Delete a car for good").click();
    await page.getByRole("button", { name: "Delete" }).first().click();
    await page.goto("/admin/stock?status=all&q=" + MAKE);
  }
});

test("the form checks the car and says what is wrong", async ({ page }) => {
  await page.goto("/admin/stock/new");
  await page.getByLabel("Year", { exact: true }).fill("1850");
  await page.getByRole("button", { name: "Add car" }).click();
  await expect(page.getByText("Enter the make")).toBeVisible();
  await expect(page.getByText("Enter a year from 1980")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/stock\/new$/);
});

test("add a car, see it on the site with its VAT line, change its price to a drop, mark it sold, delete it", async ({ page }) => {
  await page.goto("/admin/stock/new");
  await page.getByLabel("Make", { exact: true }).fill(MAKE);
  await page.getByLabel("Model", { exact: true }).fill("Roadster");
  await page.getByLabel("Year", { exact: true }).fill("2022");
  await page.getByLabel("Price (€)", { exact: true }).fill("19950");
  await page.locator('[name="vat"]').selectOption("ex");
  await page.getByRole("button", { name: "Add car" }).click();
  await expect(page.getByRole("status")).toContainText("Saved 2022 Zztest Roadster");

  // On the site: the card says the price and what VAT means.
  await page.goto(`/used-cars?q=${MAKE}`);
  const card = page.locator("article").filter({ hasText: "Roadster" });
  await expect(card.getByText("€19,950", { exact: true })).toBeVisible();
  await expect(card.getByText("Ex. VAT, reclaimable")).toBeVisible();
  await expect(card.getByText("€24,539 inc. VAT")).toBeVisible();

  // Edit: a lower price with the old one as the earlier price.
  await page.goto("/admin/stock?q=" + MAKE);
  await page.getByRole("link", { name: "Edit" }).first().click();
  await page.getByLabel("Price (€)", { exact: true }).fill("18500");
  await page.locator('[name="wasPriceEur"]').fill("19950");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.goto(`/used-cars?q=${MAKE}`);
  await expect(page.locator("article").filter({ hasText: "Roadster" }).getByText("Reduced by €1,450")).toBeVisible();

  // Sold: out of "For sale", in "Sold".
  await page.goto("/admin/stock?q=" + MAKE);
  await page.getByRole("button", { name: "Mark sold" }).click();
  await expect(page.getByRole("row", { name: new RegExp(MAKE) })).toHaveCount(0);
  await page.goto("/admin/stock?status=sold&q=" + MAKE);
  await expect(page.getByRole("row", { name: new RegExp(MAKE) })).toContainText("Sold");

  // Delete: gone from the dealer's list and from the site.
  await page.getByText("Delete a car for good").click();
  await page.getByRole("button", { name: "Delete" }).first().click();
  await expect(page.getByRole("status")).toHaveText("Car deleted.");
  await expect(page.getByRole("row", { name: new RegExp(MAKE) })).toHaveCount(0);
});

test("with the margins permission the cost is saved with the car and shows on the Margins screen", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await context.addCookies([{ name: "checkwork-demo-perms", value: "margins", url: "http://localhost:3000" }]);
  await page.goto("/admin/stock/new");
  await page.getByLabel("Make", { exact: true }).fill(MAKE);
  await page.getByLabel("Model", { exact: true }).fill("Margin");
  await page.getByLabel("Year", { exact: true }).fill("2021");
  await page.getByLabel("Price (€)", { exact: true }).fill("20000");
  await page.getByLabel("Cost price (€)").fill("16500");
  await page.getByRole("button", { name: "Add car" }).click();
  await expect(page).toHaveURL(/\/admin\/stock\?saved=/);
  await page.goto("/admin/margins");
  const row = page.getByRole("row", { name: new RegExp(MAKE) });
  await expect(row).toContainText("€16,500");
  await expect(row).toContainText("€3,500"); // 20,000 less 16,500
});

