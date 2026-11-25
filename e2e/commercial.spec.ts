import { expect, test } from "@playwright/test";

test("commercial vehicles have the filters too, and keep them across a car page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/commercial?make=ford");
  await expect(page.getByRole("heading", { level: 1, name: "Commercials" })).toBeVisible();
  await expect(page.getByTestId("count")).toHaveText("3 commercials");
  await page.locator("article").first().getByRole("link").first().click();
  await expect(page.getByTestId("buy-box")).toBeVisible();
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Commercials", exact: true }).click();
  await expect(page).toHaveURL(/\/commercial\?make=ford/);
});

test("commercials say their price is without VAT, give the price with VAT, and show a drop in words", async ({ page }) => {
  await page.goto("/commercial");
  await expect(page.getByRole("heading", { level: 1, name: "Commercials" })).toBeVisible();
  const transit = page.locator("article").filter({ hasText: "1.5 EcoBlue 100 Trend" });
  await expect(transit.getByText("€14,950", { exact: true })).toBeVisible();
  await expect(transit.getByText("Ex. VAT", { exact: true })).toBeVisible();
  await expect(transit.getByText("€18,389 inc. VAT")).toBeVisible();
  await expect(transit.getByText("Reduced by €1,500")).toBeVisible();
});

test("a van is not in the used list, and a van's page says its VAT and links back to Commercials", async ({ page }) => {
  await page.goto("/used-cars");
  await expect(page.locator("article").filter({ hasText: "Transit connect" })).toHaveCount(0);
  await page.goto("/commercial");
  await page.locator("article").filter({ hasText: "Vito" }).getByRole("link").first().click();
  await expect(page.getByTestId("buy-box").getByText("Ex. VAT", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Commercials" })).toHaveAttribute("href", "/commercial");
});

test("the commercial page fits a phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/commercial");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("the sitemap answers", async ({ request }) => {
  const body = await (await request.get("/sitemap.xml")).text();
  // The sitemap is empty outside production (indexable), so only check it answers.
  expect(body.length).toBeGreaterThan(0);
});

test("a commercial is sold used: the dealer's warranty, its owners and its mileage, as a used car has", async ({ page }) => {
  await page.goto("/used-cars/ford-transit-connect-2020-5100004");
  await expect(page.getByTestId("buy-box").getByText("12 month warranty included")).toBeVisible();
  await expect(page.getByText("Manufacturer's warranty")).toHaveCount(0);
  await expect(page.getByRole("main").getByText("Owners", { exact: true })).toBeVisible();
  await expect(page.getByTestId("buy-box")).toContainText("94,200 km");
});

test("a commercial body type has its own page: only that type, with its own heading and title", async ({ page }) => {
  await page.goto("/commercial/vans");
  await expect(page).toHaveTitle(/^Used vans for sale in /);
  await expect(page.getByRole("heading", { level: 1, name: "Used vans" })).toBeVisible();
  await expect(page.getByText(/^We have 5 used vans in stock in /)).toBeVisible();
  await expect(page.getByTestId("count")).toHaveText("5 vans");
  await expect(page.locator("article")).toHaveCount(5);
  await expect(page.locator("article").filter({ hasText: "Ranger" })).toHaveCount(0); // the pickup is on /commercial/pickups
  expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(/\/commercial\/vans$/);
  await page.goto("/commercial/pickups");
  await expect(page.getByRole("heading", { level: 1, name: "Used pickups" })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(1);
  expect((await page.goto("/commercial/van"))?.status()).toBe(404); // the page is the plural
});

test("a make's commercial list names the make in the heading", async ({ page }) => {
  await page.goto("/commercial/ford");
  await expect(page.getByRole("heading", { level: 1, name: "Ford commercials" })).toBeVisible();
  await expect(page.locator("article").first()).toContainText("Ford");
  await expect(page.locator("article").filter({ hasNotText: "Ford" })).toHaveCount(0);
});

test("a make's commercial list with none in stock says so by name, with no filter to clear", async ({ page }) => {
  await page.goto("/commercial/toyota");
  await expect(page.getByTestId("count")).toHaveText("No commercials");
  await expect(page.getByRole("heading", { name: "No Toyota commercials right now" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Toyota" })).toBeVisible(); // the make by name, never its slug
  await expect(page.getByRole("button", { name: "Clear all filters" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Can't find it? Ask us to find it for you." })).toHaveAttribute("href", "/find-a-car");
});

test("old new-car links go on to used cars, the make page and the find a car form", async ({ page }) => {
  for (const [from, to] of [["/new-cars?make=kia", /\/used-cars\?make=kia$/], ["/new-cars/kia", /\/makes\/kia$/], ["/new-cars/order", /\/find-a-car$/]] as const) {
    await page.goto(from);
    await expect(page, from).toHaveURL(to);
  }
});
