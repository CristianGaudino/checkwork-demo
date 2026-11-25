import { expect, test } from "@playwright/test";

test("commercial vehicles have the filters too, and keep them across a car page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/commercial?make=ford");
  await expect(page.getByRole("heading", { level: 1, name: "Commercial vehicles" })).toBeVisible();
  await expect(page.getByTestId("count")).toHaveText("3 vans");
  await page.locator("article").first().getByRole("link").first().click();
  await expect(page.getByTestId("buy-box")).toBeVisible();
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Commercial", exact: true }).click();
  await expect(page).toHaveURL(/\/commercial\?make=ford/);
});

test("vans say their price is without VAT, give the price with VAT, and show a drop in words", async ({ page }) => {
  await page.goto("/commercial");
  await expect(page.getByRole("heading", { level: 1, name: "Commercial vehicles" })).toBeVisible();
  const transit = page.locator("article").filter({ hasText: "1.5 EcoBlue 100 Trend" });
  await expect(transit.getByText("€22,450", { exact: true })).toBeVisible();
  await expect(transit.getByText("Ex. VAT", { exact: true })).toBeVisible();
  await expect(transit.getByText("€27,614 inc. VAT")).toBeVisible();
  await expect(transit.getByText("Reduced by €1,500")).toBeVisible();
});

test("a van is not in the used list, and a van's page says its VAT and links back to Commercial", async ({ page }) => {
  await page.goto("/used-cars");
  await expect(page.locator("article").filter({ hasText: "Transit connect" })).toHaveCount(0);
  await page.goto("/commercial");
  await page.locator("article").filter({ hasText: "Vito" }).getByRole("link").first().click();
  await expect(page.getByTestId("buy-box").getByText("Ex. VAT", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Commercial" })).toHaveAttribute("href", "/commercial");
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

test("a new van shows the manufacturer's warranty, and a used car keeps the dealer's", async ({ page }) => {
  await page.goto("/used-cars/ford-transit-connect-2026-5100004");
  await expect(page.getByTestId("buy-box").getByText("Manufacturer's warranty included")).toBeVisible();
  await expect(page.getByRole("main").getByText("Owners", { exact: true })).toHaveCount(0); // 0 owners is no row, not "Owners 0"
  await page.goto("/used-cars");
  await page.locator("article").first().getByRole("link").first().click();
  await expect(page.getByTestId("buy-box").getByText("12 month warranty included")).toBeVisible();
});

test("a make's commercial list names the make in the heading", async ({ page }) => {
  await page.goto("/commercial/ford");
  await expect(page.getByRole("heading", { level: 1, name: "Ford vans and commercials" })).toBeVisible();
  await expect(page.locator("article").first()).toContainText("Ford");
  await expect(page.locator("article").filter({ hasNotText: "Ford" })).toHaveCount(0);
});

test("a make's commercial list with none in stock says so by name, with no filter to clear", async ({ page }) => {
  await page.goto("/commercial/toyota");
  await expect(page.getByTestId("count")).toHaveText("No vans");
  await expect(page.getByRole("heading", { name: "No Toyota vans right now" })).toBeVisible();
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
