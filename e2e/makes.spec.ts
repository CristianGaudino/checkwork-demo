import { expect, test } from "@playwright/test";

// A page per make (#97), the menu (#98) and the demo bar at the foot of the screen (#94).
test("a make page shows what we have of it, used and new, each with the way to its full list", async ({ page }) => {
  await page.goto("/makes/toyota");
  await expect(page.getByRole("heading", { level: 1, name: "Toyota" })).toBeVisible();
  const used = page.getByRole("region", { name: "Used Toyota" });
  await expect(used.getByRole("link", { name: /^See all \d+$/ })).toHaveAttribute("href", "/used-cars/toyota");
  await expect(used.locator("article").first()).toBeVisible();
  const fresh = page.getByRole("region", { name: "New Toyota" });
  await fresh.getByRole("link", { name: /^See all \d+$/ }).click();
  await expect(page).toHaveURL(/\/new-cars\/toyota$/);
  await expect(page.locator("article").first()).toContainText("Toyota");
  await expect(page.locator("article").filter({ hasNotText: "Toyota" })).toHaveCount(0);
});

test("a make with none in stock says so, shows what sold and what we have, and offers to find one", async ({ page }) => {
  await page.goto("/makes/audi");
  await expect(page.getByText("No Audi in stock right now.")).toBeVisible();
  await expect(page.getByRole("region", { name: "In stock now" }).locator("article").first()).toBeVisible();
  await page.getByRole("link", { name: "Find one for me" }).click();
  await expect(page).toHaveURL(/\/find-a-car\?make=Audi$/);
  await expect(page.getByLabel("Make", { exact: true })).toHaveValue("Audi");
});

test("every make has a page from the makes list, and an unknown one is a 404", async ({ page }) => {
  await page.goto("/makes");
  await expect(page.getByRole("region", { name: "In stock" }).getByRole("link").first()).toHaveAttribute("href", /^\/makes\/[a-z-]+$/);
  await page.getByRole("region", { name: "Other makes" }).getByRole("link", { name: "Tesla" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Tesla" })).toBeVisible();
  expect((await page.goto("/makes/not-a-make"))!.status()).toBe(404);
  expect((await page.goto("/new-cars/not-a-make"))!.status()).toBe(404);
});

test("the used make page links to the make's page across every kind", async ({ page }) => {
  await page.goto("/used-cars/toyota");
  await page.getByRole("link", { name: "Every Toyota: used, new and commercial" }).click();
  await expect(page).toHaveURL(/\/makes\/toyota$/);
});

test("on a phone the demo bar is a pill at the foot of the screen, and the page ends above it", async ({ page }) => {
  await page.goto("/");
  const bar = (await page.locator("[data-demo-bar]").getByRole("button", { name: /^Demo/ }).boundingBox())!;
  const vh = page.viewportSize()!.height;
  expect(bar.height).toBeLessThanOrEqual(44); // small: one line, not a strip across the screen
  expect(vh - (bar.y + bar.height)).toBeLessThanOrEqual(16);
  // The page's room for the bar is set once the bar has measured itself (after hydration): wait for it, as a slow load is late with it.
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--demo-bar-h").trim())).not.toBe("");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const footer = (await page.getByRole("contentinfo").boundingBox())!;
  expect(footer.y + footer.height).toBeLessThanOrEqual(bar.y + 1);
});

test("Find a car takes a make with an accent from the link", async ({ page }) => {
  await page.goto("/find-a-car?make=%C5%A0koda"); // Škoda, as a feed may spell it
  await expect(page.getByLabel("Make", { exact: true })).toHaveValue("Skoda");
});
