import { expect, test } from "@playwright/test";

// A page per make (#97), the menu (#98).
test("a make page shows what we have of it, used and commercial, with the way to a full list only when there are more", async ({ page }) => {
  await page.goto("/makes/ford");
  await expect(page.getByRole("heading", { level: 1, name: "Ford" })).toBeVisible();
  const used = page.getByRole("region", { name: "Used Ford" });
  await expect(used.locator("article").first()).toBeVisible();
  const vans = page.getByRole("region", { name: "Ford vans and commercials" });
  await expect(vans.locator("article")).toHaveCount(3);
  await expect(page.getByRole("link", { name: /^See all \d+$/ })).toHaveCount(0); // every Ford is already shown
  await page.goto("/makes/kia"); // more used Kias than the page shows
  await page.getByRole("region", { name: "Used Kia" }).getByRole("link", { name: /^See all \d+$/ }).click();
  await expect(page).toHaveURL(/\/used-cars\/kia$/);
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
  await expect(page.locator("main").getByRole("link", { name: /Audi/ })).toHaveCount(0); // none in stock: not listed
  await page.goto("/makes/tesla"); // still has its page
  await expect(page.getByRole("heading", { level: 1, name: "Tesla" })).toBeVisible();
  expect((await page.goto("/makes/not-a-make"))!.status()).toBe(404);
  expect((await page.goto("/commercial/not-a-make"))!.status()).toBe(404);
});

test("the used make page links to the make's page across every kind", async ({ page }) => {
  await page.goto("/used-cars/toyota");
  await page.getByRole("link", { name: "Every Toyota: used and commercial" }).click();
  await expect(page).toHaveURL(/\/makes\/toyota$/);
});

test("Find a car takes a make with an accent from the link", async ({ page }) => {
  await page.goto("/find-a-car?make=%C5%A0koda"); // Škoda, as a feed may spell it
  await expect(page.getByLabel("Make", { exact: true })).toHaveValue("Skoda");
});
