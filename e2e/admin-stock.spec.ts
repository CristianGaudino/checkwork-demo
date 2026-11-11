import { expect, test } from "@playwright/test";
import { choose } from "./combo";

// The dealer adds, edits, sells and deletes a car, and the public site follows. One made-up make, so no other test sees it, and it is
// deleted at the end whatever happens.
const MAKE = "Zztest";

// The row buttons (Edit, Mark sold) are a desktop table's; on a phone the row itself opens the car.
test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

test.afterEach(async ({ page }) => {
  await page.goto("/dashboard/stock?status=all&q=" + MAKE);
  const row = page.getByRole("row", { name: new RegExp(MAKE) });
  while ((await row.count()) > 0) {
    await row.first().getByRole("link", { name: /^Edit / }).click();
    await page.getByRole("button", { name: /^Delete / }).click();
    await page.goto("/dashboard/stock?status=all&q=" + MAKE);
  }
});

test("the form checks the car and says what is wrong", async ({ page }) => {
  await page.goto("/dashboard/stock/new");
  await page.getByLabel("Year", { exact: true }).fill("1850");
  await page.getByRole("button", { name: "Add car" }).click();
  await expect(page.getByText("Enter the make")).toBeVisible();
  await expect(page.getByText("Enter a year from 1980")).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\/stock\/new$/);
});

test("add a car, see it on the site with its VAT line, change its price to a drop, mark it sold, delete it", async ({ page }) => {
  await page.goto("/dashboard/stock/new");
  await page.getByLabel("Make", { exact: true }).fill(MAKE);
  await page.getByLabel("Model", { exact: true }).fill("Roadster");
  await page.getByLabel("Year", { exact: true }).fill("2022");
  await page.getByLabel("Price (€)", { exact: true }).fill("19950");
  await choose(page.getByLabel("VAT"), /excludes/);
  await page.getByRole("button", { name: "Add car" }).click();
  await expect(page.getByRole("status")).toContainText("Saved 2022 Zztest Roadster");

  // On the site: the card says the price and what VAT means.
  await page.goto(`/used-cars?q=${MAKE}`);
  const card = page.locator("article").filter({ hasText: "Roadster" });
  await expect(card.getByText("€19,950", { exact: true })).toBeVisible();
  await expect(card.getByText("Ex. VAT, reclaimable")).toBeVisible();
  await expect(card.getByText("€24,539 inc. VAT")).toBeVisible();

  // Edit: a lower price with the old one as the earlier price.
  await page.goto("/dashboard/stock?q=" + MAKE);
  await page.getByRole("link", { name: "Edit" }).first().click();
  await page.getByLabel("Price (€)", { exact: true }).fill("18500");
  await page.locator('[name="wasPriceEur"]').fill("19950");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.goto(`/used-cars?q=${MAKE}`);
  await expect(page.locator("article").filter({ hasText: "Roadster" }).getByText("Reduced by €1,450")).toBeVisible();

  // Sold: out of "For sale", in "Sold".
  await page.goto("/dashboard/stock?q=" + MAKE);
  await page.getByRole("button", { name: "Mark sold" }).click();
  await expect(page.getByRole("row", { name: new RegExp(MAKE) })).toHaveCount(0);
  await page.goto("/dashboard/stock?status=sold&q=" + MAKE);
  await expect(page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("button", { name: "Back on sale" })).toBeVisible();

  // Delete, from the car's own page: gone from the dealer's list and from the site.
  await page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("link", { name: /^Edit / }).click();
  await page.getByRole("button", { name: /^Delete / }).click();
  await expect(page.getByRole("status")).toHaveText("Car deleted.");
  await expect(page.getByRole("row", { name: new RegExp(MAKE) })).toHaveCount(0);
});

test("with the margins permission the cost is saved with the car and shows on the Margins screen", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); // the demo opens as the owner, who has margins
  await page.goto("/dashboard/stock/new");
  await page.getByLabel("Make", { exact: true }).fill(MAKE);
  await page.getByLabel("Model", { exact: true }).fill("Margin");
  await page.getByLabel("Year", { exact: true }).fill("2021");
  await page.getByLabel("Price (€)", { exact: true }).fill("20000");
  await page.getByLabel("Cost price (€)").fill("16500");
  await page.getByRole("button", { name: "Add car" }).click();
  await expect(page).toHaveURL(/\/dashboard\/stock\?saved=/);
  await page.goto("/dashboard/margins");
  const row = page.getByRole("row", { name: new RegExp(MAKE) });
  await expect(row).toContainText("€16,500");
  await expect(row).toContainText("€3,500"); // 20,000 less 16,500
});

