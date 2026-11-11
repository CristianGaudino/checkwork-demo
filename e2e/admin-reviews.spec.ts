import { expect, test } from "@playwright/test";

test("reviews show a rating summary, and a reply can be posted, then the review leaves Needs a reply", async ({ page }) => {
  await page.goto("/dashboard/reviews");
  await expect(page.getByRole("img", { name: /out of 5 stars/ }).first()).toBeVisible();
  await page.getByRole("link", { name: /^Needs a reply/ }).click();
  const first = page.locator("[data-review]").first();
  const author = await first.locator("[data-author]").textContent();
  await first.getByText("Reply", { exact: true }).click();
  await first.locator("textarea").fill("Thank you, we are glad it went well.");
  await first.getByRole("button", { name: "Post reply" }).click();
  await expect(page.getByRole("status")).toHaveText("Reply posted on Google.");
  await page.goto("/dashboard/reviews?filter=unreplied");
  await expect(page.getByText(author!, { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: /^All/ }).click();
  await expect(page.getByText("Thank you, we are glad it went well.").first()).toBeVisible();
});

test("a reply goes to Google first and says so; flags are gone, since Google cannot take them", async ({ page }) => {
  await page.goto("/dashboard/reviews?filter=low");
  await expect(page.getByText(/Replies post on Google/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Flag for review" })).toHaveCount(0);
  const first = page.locator("[data-review]").first();
  await first.getByText(/^(Reply|Edit reply)$/).click();
  await first.locator("textarea").fill(`Sorry to hear it. Please call us. ${Date.now()}`);
  await first.getByRole("button", { name: /^(Post|Update) reply$/ }).click();
  await expect(page.getByRole("status")).toHaveText("Reply posted on Google.");
});

