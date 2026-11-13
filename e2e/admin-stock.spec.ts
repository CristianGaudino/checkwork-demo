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
    await row.first().getByRole("link").first().click();
    await page.getByRole("button", { name: /^Delete / }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await page.waitForURL(/deleted=1/);
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
  await page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("link").first().click();
  await page.getByLabel("Price (€)", { exact: true }).fill("18500");
  await page.locator('[name="wasPriceEur"]').fill("19950");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.goto(`/used-cars?q=${MAKE}`);
  await expect(page.locator("article").filter({ hasText: "Roadster" }).getByText("Reduced by €1,450")).toBeVisible();

  // Sold: Mark sold records the sale (price, day, salesperson, a new customer), then the car is out of "For sale" and in "Sold".
  await page.goto("/dashboard/stock?q=" + MAKE);
  await page.getByRole("link", { name: "Mark sold" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mark sold");
  await page.getByLabel("Sale price (€)").fill("18000");
  await page.getByLabel("Name", { exact: true }).fill("Pat Byrne");
  await page.getByLabel("Phone", { exact: true }).fill("+353 83 000 4321");
  await page.getByRole("button", { name: "Mark sold" }).click();
  await expect(page.getByRole("status")).toContainText(/Sale recorded for/);
  await page.goto("/dashboard/stock?q=" + MAKE);
  await expect(page.getByRole("row", { name: new RegExp(MAKE) })).toHaveCount(0);
  await page.goto("/dashboard/stock?view=sold&q=" + MAKE);
  const sold = page.getByRole("row", { name: new RegExp(MAKE) });
  await expect(sold).toContainText("sold for €18,000");
  await sold.getByRole("button", { name: /^More for/ }).click();
  await expect(sold.getByRole("link", { name: "Undo sale" })).toBeVisible(); // a recorded sale is undone, never thrown away

  // Delete, from the car's own page, asks first: Cancel keeps it; Delete takes it from the dealer's list and the site.
  await page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("link").first().click();
  await page.getByRole("button", { name: /^Delete / }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: /^Delete / }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("status")).toHaveText("Car deleted.");
  await expect(page.getByRole("row", { name: new RegExp(MAKE) })).toHaveCount(0);
});

test("a draft and a hidden car are off the website and their link is not found; hiding can be undone", async ({ page }) => {
  await page.goto("/dashboard/stock/new");
  await page.getByLabel("Make", { exact: true }).fill(MAKE);
  await page.getByLabel("Model", { exact: true }).fill("Draft");
  await page.getByLabel("Year", { exact: true }).fill("2020");
  await page.getByLabel("Price (€)", { exact: true }).fill("15000");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Saved 2020 Zztest Draft");
  await page.goto(`/used-cars?q=${MAKE}`);
  await expect(page.locator("article").filter({ hasText: "Draft" })).toHaveCount(0);

  // Publish from the Drafts view: on the website, with its own page.
  await page.goto("/dashboard/stock?view=drafts&q=" + MAKE);
  const row = page.getByRole("row", { name: new RegExp(MAKE) });
  await row.getByRole("button", { name: /^More for/ }).click();
  await row.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByTestId("toast")).toContainText("Published 2020 Zztest Draft");
  await page.goto("/dashboard/stock?q=" + MAKE);
  await page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("link").first().click();
  const href = await page.getByRole("link", { name: "View on the site" }).getAttribute("href");
  expect((await page.request.get(href!)).status()).toBe(200);

  // Hide: not found on the website. Undo in the toast puts it back.
  await page.goto("/dashboard/stock?q=" + MAKE);
  await page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("button", { name: /^More for/ }).click();
  await page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("button", { name: "Hide" }).click();
  await expect(page.getByTestId("toast")).toContainText("Hid 2020 Zztest Draft");
  expect((await page.request.get(href!)).status()).toBe(404);
  await page.getByTestId("toast").getByRole("button", { name: "Undo" }).click();
  await page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("button", { name: /^More for/ }).click();
  await expect(page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("button", { name: "Hide" })).toBeVisible();
  expect((await page.request.get(href!)).status()).toBe(200);
});

test("a deposit reserves a car on the website; ending it puts it back; a sale brought back is undone and kept", async ({ page }) => {
  await page.goto("/dashboard/stock/new");
  await page.getByLabel("Make", { exact: true }).fill(MAKE);
  await page.getByLabel("Model", { exact: true }).fill("Deposit");
  await page.getByLabel("Year", { exact: true }).fill("2019");
  await page.getByLabel("Price (€)", { exact: true }).fill("14000");
  await page.getByRole("button", { name: "Add car" }).click();
  await expect(page.getByRole("status")).toContainText("Saved 2019 Zztest Deposit");

  // Take a deposit: the car shows as Reserved on the website, after the cars for sale.
  await page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("button", { name: /^More for/ }).click();
  await page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("link", { name: "Reserve" }).click();
  await page.getByLabel("Deposit (€)").fill("500");
  await page.getByLabel("Held until").fill(new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10));
  await page.getByLabel("Name", { exact: true }).fill("Sam Reid");
  await page.getByLabel("Phone", { exact: true }).fill("+353 83 000 5555");
  await page.getByRole("button", { name: "Take deposit" }).click();
  await expect(page.getByRole("status")).toContainText("Deposit taken");
  await page.goto(`/used-cars?q=${MAKE}`);
  const card = page.locator("article").filter({ hasText: "Deposit" });
  await expect(card.getByText("Reserved", { exact: true })).toBeVisible();
  await card.getByRole("link").first().click();
  await expect(page.getByTestId("action-area")).toContainText("A deposit has been paid on this car");

  // End it, refunded: back on sale.
  await page.goto("/dashboard/stock?view=reserved&q=" + MAKE);
  await page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("button", { name: /^More for/ }).click();
  await page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("link", { name: "Deposit", exact: true }).click();
  await page.getByRole("button", { name: "End reservation" }).click();
  await page.waitForURL(/\/dashboard\/stock$/);
  await page.goto(`/used-cars?q=${MAKE}`);
  await expect(page.locator("article").filter({ hasText: "Deposit" }).getByText("Reserved", { exact: true })).toHaveCount(0);

  // Sell it, then the buyer brings it back: the sale is undone, kept on the car's page, and the car is hidden for a look over.
  await page.goto("/dashboard/stock?q=" + MAKE);
  await page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("link", { name: "Mark sold" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mark sold");
  await page.getByLabel("Name", { exact: true }).fill("Sam Reid");
  await page.getByLabel("Phone", { exact: true }).fill("+353 83 000 5555");
  await page.getByRole("button", { name: "Mark sold" }).click();
  await expect(page.getByRole("status")).toContainText(/Sale recorded for/);
  await page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("button", { name: /^More for/ }).click();
  await page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("link", { name: "Undo sale" }).click();
  await expect(page.getByText(/within 30 days of the sale/)).toBeVisible();
  await page.getByLabel("Refunded (€)").fill("14000");
  await page.getByLabel("Why it came back").fill("Gearbox fault");
  await page.getByRole("button", { name: "Take it back" }).click();
  await expect(page.getByRole("status")).toContainText("Sale undone for 2019 Zztest Deposit");
  await page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("link").first().click();
  const history = page.getByRole("region", { name: "Deposits and undone sales" });
  await expect(history).toContainText("€14,000 refunded: Gearbox fault");
  await expect(history).toContainText("ended, €500 refunded");
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


// Add a made-up car and come back to the list (the afterEach deletes it).
async function addCar(page: import("@playwright/test").Page, model: string, price: string) {
  await page.goto("/dashboard/stock/new");
  await page.getByLabel("Make", { exact: true }).fill(MAKE);
  await page.getByLabel("Model", { exact: true }).fill(model);
  await page.getByLabel("Year", { exact: true }).fill("2021");
  await page.getByLabel("Price (€)", { exact: true }).fill(price);
  await page.getByRole("button", { name: "Add car" }).click();
  await expect(page.getByRole("status")).toContainText(`Saved 2021 ${MAKE} ${model}`);
}

test("tick several cars: drop their price at once, then delete them", async ({ page }) => {
  await addCar(page, "Alpha", "10000");
  await addCar(page, "Beta", "20000");
  await page.goto("/dashboard/stock?q=" + MAKE);
  await page.getByLabel(`Select 2021 ${MAKE} Alpha`).check();
  await page.getByLabel(`Select 2021 ${MAKE} Beta`).check();
  await expect(page.getByText("2 cars selected")).toBeVisible();
  await page.getByRole("button", { name: "Drop the price" }).first().click();
  await page.getByLabel("Drop by").fill("10");
  await page.getByRole("button", { name: "%", exact: true }).click();
  await page.locator("#stock-bulk").getByRole("button", { name: "Drop the price" }).last().click();
  await expect(page.getByRole("dialog")).toContainText("Drop the price of 2 cars by 10%?");
  await page.getByRole("dialog").getByRole("button", { name: "Drop the price" }).click();
  await expect(page.getByText("Price dropped on 2 cars")).toBeVisible();
  await expect(page.getByRole("row", { name: /Alpha/ })).toContainText("€9,000");
  await expect(page.getByRole("row", { name: /Beta/ })).toContainText("was €20,000");

  await page.getByLabel(`Select 2021 ${MAKE} Alpha`).check();
  await page.getByLabel(`Select 2021 ${MAKE} Beta`).check();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Deleted 2 cars")).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(MAKE) })).toHaveCount(0);
});

test("a car's photos: add one, it shows on the site, remove it", async ({ page }) => {
  await addCar(page, "Photo", "15000");
  await page.getByRole("link", { name: "Add its photos" }).click();
  await page.locator('#photos input[type="file"]').setInputFiles("public/stock/4710001/1-b1b37b33.webp");
  await expect(page.getByText("Photo added")).toBeVisible();
  await expect(page.locator("#photos").getByText("Main photo")).toBeVisible();

  await page.goto(`/used-cars?q=${MAKE}`);
  await expect(page.locator("article").filter({ hasText: "Photo" }).locator('img[src^="data:image/jpeg"]').first()).toBeAttached();

  await page.goto("/dashboard/stock?q=" + MAKE);
  await page.getByRole("row", { name: new RegExp(MAKE) }).getByRole("link").first().click();
  await page.getByRole("button", { name: "Remove photo 1" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
  await expect(page.locator("#photos").getByText("Main photo")).toHaveCount(0);
});
