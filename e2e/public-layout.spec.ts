import { expect, test } from "@playwright/test";

// Long pages on a phone (the default device here is a Pixel 7): the featured cars are a row to swipe, the warranty claim is one tap away.

test("on a phone the featured cars are one row to swipe, not six screens; from 640px a grid", async ({ page }) => {
  await page.goto("/");
  const row = page.getByRole("list", { name: "Featured stock" });
  const cards = row.getByRole("listitem");
  expect(await cards.count()).toBeGreaterThan(1);
  const [a, b] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()];
  expect(Math.abs(a!.y - b!.y)).toBeLessThan(2); // side by side
  expect(await row.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  expect(await row.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(false);
});

test("the warranty page's Make a claim goes to the claim form", async ({ page }) => {
  await page.goto("/warranty");
  await page.getByRole("link", { name: "Make a claim" }).click();
  await expect(page).toHaveURL(/#claim$/);
  await expect(page.getByRole("heading", { name: "Make a claim", exact: true })).toBeInViewport();
});

test("a test drive car shows its name and, under it, only what tells it apart", async ({ page }) => {
  await page.goto("/test-drive");
  const row = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: "Book" }) }).first();
  const lines = await row.locator("p").allTextContents();
  expect(lines[0]).toMatch(/^\d{4} /); // the name: year, make, model
  const [, make] = lines[0].split(" ");
  if (lines.length === 3) expect(lines[1].startsWith(make)).toBe(false); // the variant, not the make and model again
});
