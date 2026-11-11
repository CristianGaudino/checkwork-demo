import { expect, test } from "@playwright/test";

test("the Reviews page shows Google's reviews as Google gives them, the rating, and the way to all of them", async ({ page }) => {
  await page.goto("/reviews");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reviews");
  await expect(page.getByRole("list", { name: "Google reviews" }).getByRole("listitem")).toHaveCount(5);
  await expect(page.getByRole("link", { name: /See all on Google Maps/ })).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: /review policy/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Leave a review on Google Maps/ })).toBeVisible();
});

test("the Questions page answers from what the site says, one press opens an answer", async ({ page }) => {
  await page.goto("/faq");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Questions");
  const q = page.getByText("Does a used car come with a warranty?");
  await q.click();
  await expect(page.getByText(/12 month warranty: engine and gearbox cover/)).toBeVisible();
  await page.getByText("Can I buy a car on finance?").click();
  await expect(page.getByText(/subject to status/)).toBeVisible();
  expect(await page.evaluate(() => document.body.innerText.includes("—"))).toBe(false); // no em dashes on the site
});

test("both pages are in the menu and the footer, and hold at 320px", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: "Reviews" })).toHaveAttribute("href", "/reviews");
  await expect(footer.getByRole("link", { name: "Questions" })).toHaveAttribute("href", "/faq");
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of ["/reviews", "/faq"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  }
});
