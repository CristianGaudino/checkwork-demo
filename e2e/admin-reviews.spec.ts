import { expect, test } from "@playwright/test";

test("reviews show a rating summary, and a reply can be posted, then the review leaves Needs a reply", async ({ page }) => {
  await page.goto("/admin/reviews");
  await expect(page.getByRole("img", { name: /out of 5 stars/ }).first()).toBeVisible();
  await page.getByRole("link", { name: "Needs a reply" }).click();
  const first = page.locator("section").filter({ has: page.getByRole("button", { name: "Post reply" }) }).first();
  const author = await first.locator("span.font-semibold").first().textContent();
  await first.locator("textarea").fill("Thank you, we are glad it went well.");
  await first.getByRole("button", { name: "Post reply" }).click();
  await expect(page.getByText(author!, { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "All", exact: true }).click();
  await expect(page.getByText("Thank you, we are glad it went well.").first()).toBeVisible();
});

test("a review can be flagged", async ({ page }) => {
  await page.goto("/admin/reviews?filter=low");
  await page.getByRole("button", { name: "Flag for review" }).first().click();
  await page.getByRole("link", { name: "Flagged" }).click();
  await expect(page.getByText("Flagged", { exact: true }).first()).toBeVisible();
});
