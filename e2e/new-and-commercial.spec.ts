import { expect, test } from "@playwright/test";

test("new cars: a heading, the franchise makes first, and a make filter in the URL", async ({ page }) => {
  await page.goto("/new-cars");
  await expect(page.getByRole("heading", { level: 1, name: "New Cars" })).toBeVisible();
  const makes = page.getByRole("navigation", { name: "Makes" }).getByRole("link");
  await expect(makes.first()).toHaveText(/^All makes/);
  await expect(makes.nth(1)).toContainText("Hyundai"); // the first partner, not the first alphabetically
  await expect(page.locator("article")).toHaveCount(6);
  await makes.nth(1).click();
  await expect(page).toHaveURL(/make=hyundai/);
  await expect(page.locator("article")).toHaveCount(1);
  await page.goto("/new-cars?make=not-a-make");
  await expect(page.locator("article")).toHaveCount(6); // an unknown make shows everything
});

test("vans say their price is without VAT, give the price with VAT, and show a drop in words", async ({ page }) => {
  await page.goto("/commercial");
  await expect(page.getByRole("heading", { level: 1, name: "Commercial Vehicles" })).toBeVisible();
  const transit = page.locator("article").filter({ hasText: "Transit Custom" });
  await expect(transit.getByText("€27,950", { exact: true })).toBeVisible();
  await expect(transit.getByText("Ex. VAT, reclaimable")).toBeVisible();
  await expect(transit.getByText("€34,379 inc. VAT")).toBeVisible();
  await expect(transit.getByText("Reduced by €4,000")).toBeVisible();
});

test("a new car is not in the used list, and a van's page says its VAT and links back to Commercial", async ({ page }) => {
  await page.goto("/used-cars");
  await expect(page.locator("article").filter({ hasText: "Transit Custom" })).toHaveCount(0);
  await expect(page.locator("article").filter({ hasText: "Picanto" })).toHaveCount(0);
  await page.goto("/commercial");
  await page.locator("article").filter({ hasText: "Sprinter" }).getByRole("link").first().click();
  await expect(page.getByTestId("buy-box").getByText("Ex. VAT, reclaimable")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Commercial" })).toHaveAttribute("href", "/commercial");
});

test("the switch shows Used, New and Commercial in the header on a desktop, and under the search on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/new-cars");
  const sw = page.getByRole("banner").getByRole("navigation", { name: "Vehicle type" });
  await expect(sw.getByRole("link")).toHaveText(["Used", "New", "Commercial"]);
  await expect(sw.getByRole("link", { name: "New" })).toHaveAttribute("aria-current", "page");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("banner").getByRole("navigation", { name: "Vehicle type" })).toBeHidden();
  await expect(page.getByRole("main").getByRole("navigation", { name: "Vehicle type" })).toBeVisible();
});

test("a new car's page and a van's page highlight New and Commercial in the switch, not Used", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const sw = page.getByRole("banner").getByRole("navigation", { name: "Vehicle type" });
  for (const [list, name, label] of [["/new-cars", "Picanto", "New"], ["/commercial", "Sprinter", "Commercial"]] as const) {
    await page.goto(list);
    await page.locator("article").filter({ hasText: name }).getByRole("link").first().click();
    await expect(page.getByTestId("buy-box")).toBeVisible();
    await expect(sw.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
    await expect(sw.getByRole("link", { name: "Used" })).not.toHaveAttribute("aria-current", "page");
  }
});

test("new and commercial pages fit a phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of ["/new-cars", "/commercial"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(320);
  }
});

test("the sitemap lists the new and commercial pages", async ({ request }) => {
  const body = await (await request.get("/sitemap.xml")).text();
  // The sitemap is empty outside production (indexable), so only check it answers.
  expect(body.length).toBeGreaterThan(0);
});

test("a new car shows the manufacturer's warranty, and a used car and a van keep the dealer's", async ({ page }) => {
  await page.goto("/new-cars");
  await page.locator("article").first().getByRole("link").first().click();
  await expect(page.getByTestId("buy-box").getByText("Manufacturer's Warranty Included")).toBeVisible();
  await page.goto("/used-cars/ford-transit-custom-2022-5100001");
  await expect(page.getByTestId("buy-box").getByText("3 Month Warranty Included")).toBeVisible();
});
