import { expect, test, type Page } from "@playwright/test";

// Posts and ads are written in one composer on the dashboard's own records. The three outward services are simulated on the demo
// (SIMULATE_INTEGRATIONS), so publishing, starting and sending succeed without leaving the dashboard. With simulation off they say not
// connected: src/lib/admin/publishers.test.ts.
// The composer's first step: the second car's card. Picking it moves on to Where.
async function startPost(page: Page) {
  await page.goto("/dashboard/marketing/new");
  await page.getByRole("main").locator("li > button[aria-pressed]").nth(1).click();
  await expect(page.getByRole("heading", { name: /Step 2 of 4/ })).toBeFocused();
}
const next = (page: Page) => page.getByRole("button", { name: "Next" }).click();

test("the composer goes car, where, text, when: it suggests text for the car, shows a preview, and publishing posts it", async ({ page }) => {
  await startPost(page);
  await page.getByRole("radio", { name: "Instagram" }).click();
  await next(page);
  await expect(page.getByLabel("Text")).toHaveValue(/Link in bio/);
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("radio", { name: "Facebook" }).click();
  await next(page);
  await expect(page.getByLabel("Text")).toHaveValue(/Just in: /);
  await page.getByLabel("Text").fill("Just in, come and see it.");
  await next(page);
  const preview = page.getByRole("figure", { name: "Preview" });
  await expect(preview).toContainText("Facebook");
  await expect(preview).toContainText("Just in, come and see it.");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Post published");
  await expect(page).toHaveURL(/\/dashboard\/marketing\?tab=posts/);
});

test("a post for a car can be scheduled, and is kept as a draft with Save draft", async ({ page }) => {
  await startPost(page);
  await next(page);
  await expect(page.getByLabel("Text")).not.toHaveValue(""); // the suggested text arrives once the car loads; an empty post is refused
  await next(page);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await startPost(page);
  await next(page);
  await expect(page.getByLabel("Text")).not.toHaveValue("");
  await next(page);
  await page.getByRole("radio", { name: "Later" }).click();
  await page.getByLabel("Date and time").fill("2031-01-01T10:00");
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Post scheduled");
});

test("a time in the past cannot be scheduled", async ({ page }) => {
  await startPost(page);
  await next(page);
  await expect(page.getByLabel("Text")).not.toHaveValue("");
  await next(page);
  await page.getByRole("radio", { name: "Later" }).click();
  const when = page.getByLabel("Date and time");
  await when.fill("2020-01-01T10:00");
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  expect(await when.evaluate((e: HTMLInputElement) => e.validity.rangeUnderflow)).toBe(true); // the browser stops it before it is sent
  await expect(page).toHaveURL(/\/dashboard\/marketing\/new/);
});

test("the ad switch adds a budget, and publishing starts the ad with the post", async ({ page }) => {
  await startPost(page);
  await next(page);
  await expect(page.getByLabel("Text")).not.toHaveValue("");
  await next(page);
  await expect(page.getByLabel("Budget (€)")).toHaveCount(0);
  await page.getByLabel("Also run it as an ad").check();
  await page.getByLabel("Budget (€)").fill("150");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Post published and ad started");
  await expect(page.getByRole("listitem").filter({ hasText: "Meta ad" }).filter({ hasText: "Running" }).filter({ hasText: "€150" }).first()).toBeVisible();
});

test("an idea starts the composer on its car, and the list filters to ads", async ({ page }) => {
  await page.goto("/dashboard/marketing");
  const idea = page.getByRole("link", { name: "Write a post" }).first();
  if (await idea.count()) {
    await idea.click();
    await expect(page).toHaveURL(/\/dashboard\/marketing\/new\?car=/);
    await expect(page.getByRole("heading", { name: /Step 2 of 4/ })).toBeVisible();
    await page.goto("/dashboard/marketing");
  }
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("radio", { name: "Ads", exact: true }).check();
  await expect(page).toHaveURL(/show=ad/);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("region", { name: "Posts and ads" }).getByRole("listitem").first()).toContainText(" ad");
});

test("write a newsletter from the newest cars, and sending sends it", async ({ page }) => {
  await page.goto("/dashboard/marketing?tab=newsletters");
  await page.getByRole("button", { name: "Write from the newest cars" }).click();
  await expect(page.getByRole("status")).toContainText("Newsletter draft saved");
  await expect(page.getByText("New in this week:").first()).toBeVisible();
  await page.getByRole("button", { name: /^Send to/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("status")).toContainText("Newsletter sent");
});

test("an unknown notice code shows nothing", async ({ page }) => {
  await page.goto("/dashboard/marketing?notice=<script>alert(1)</script>");
  await expect(page.getByRole("status")).toHaveCount(0);
});
