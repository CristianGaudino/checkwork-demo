import { expect, test } from "@playwright/test";
import { choose } from "./combo";

// Posts and ads are written in one composer on the dashboard's own records. The three outward services are simulated on the demo
// (SIMULATE_INTEGRATIONS), so publishing, starting and sending succeed without leaving the dashboard. With simulation off they say not
// connected: src/lib/admin/publishers.test.ts.
test("the composer suggests text for the car, shows a preview, and publishing posts it", async ({ page }) => {
  await page.goto("/dashboard/marketing");
  await choose(page.getByLabel("Car", { exact: true }), 1);
  await expect(page.getByLabel("Text")).toHaveValue(/Just in: /);
  const preview = page.getByRole("figure", { name: "Preview" });
  await expect(preview).toContainText("Just in: ");
  await page.getByRole("button", { name: "Instagram" }).click();
  await expect(page.getByLabel("Text")).toHaveValue(/Link in bio/);
  await expect(preview).toContainText("Instagram");
  await page.getByLabel("Text").fill("Just in, come and see it.");
  await expect(preview).toContainText("Just in, come and see it.");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Post published");
});

test("a post for a car can be scheduled, and is kept as a draft with Save draft", async ({ page }) => {
  await page.goto("/dashboard/marketing");
  await choose(page.getByLabel("Car", { exact: true }), 1);
  await expect(page.getByLabel("Text")).not.toHaveValue(""); // the suggested text arrives once the car loads; an empty post is refused
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await choose(page.getByLabel("Car", { exact: true }), 1);
  await expect(page.getByLabel("Text")).not.toHaveValue(""); // the suggested text arrives once the car loads; an empty post is refused
  await page.getByRole("button", { name: "Later" }).click();
  await page.getByLabel("Date and time").fill("2031-01-01T10:00");
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Post scheduled");
});

test("a time in the past is refused", async ({ page }) => {
  await page.goto("/dashboard/marketing");
  await choose(page.getByLabel("Car", { exact: true }), 1);
  await expect(page.getByLabel("Text")).not.toHaveValue(""); // the suggested text arrives once the car loads; an empty post is refused
  await page.getByRole("button", { name: "Later" }).click();
  await page.getByLabel("Date and time").fill("2020-01-01T10:00");
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Choose a time that has not passed");
});

test("the ad switch adds a budget, and publishing starts the ad with the post", async ({ page }) => {
  await page.goto("/dashboard/marketing");
  await expect(page.getByLabel("Budget (€)")).toHaveCount(0);
  await choose(page.getByLabel("Car", { exact: true }), 1);
  await page.getByLabel("Also run it as an ad").check();
  await page.getByLabel("Budget (€)").fill("150");
  await expect(page.getByLabel("Text")).not.toHaveValue(""); // the suggested text arrives once the car loads; an empty post is refused
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Post published and ad started");
  await expect(page.getByRole("listitem").filter({ hasText: "Meta ad" }).filter({ hasText: "Running" }).filter({ hasText: "€150" }).first()).toBeVisible();
});

test("write a newsletter from the newest cars, and sending sends it", async ({ page }) => {
  await page.goto("/dashboard/marketing?tab=newsletters");
  await page.getByRole("button", { name: "Write from the newest cars" }).click();
  await expect(page.getByRole("status")).toContainText("Newsletter draft saved");
  await expect(page.getByText("New in this week:").first()).toBeVisible();
  await page.getByRole("button", { name: /^Send to/ }).first().click();
  await expect(page.getByRole("status")).toContainText("Newsletter sent");
});

test("an unknown notice code shows nothing", async ({ page }) => {
  await page.goto("/dashboard/marketing?notice=<script>alert(1)</script>");
  await expect(page.getByRole("status")).toHaveCount(0);
});
