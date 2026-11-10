import { expect, test } from "@playwright/test";

// Writing and planning work on the admin's own records. Anything that would leave the admin (post, start, send) says the service is
// not connected and changes nothing: no pretend success.
test("write a post draft, edit it, schedule it, and publishing says Facebook is not connected", async ({ page }) => {
  await page.goto("/admin/marketing");
  await page.locator('select[name="carSlug"]').selectOption({ index: 1 });
  await page.getByRole("button", { name: "Write draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft written");
  const draft = page.locator("section").filter({ has: page.getByRole("button", { name: "Publish now" }) }).first();
  await expect(draft.locator("textarea")).toHaveValue(/Just in: /);
  await draft.locator("textarea").fill("Just in, come and see it.");
  await draft.getByRole("button", { name: "Save text" }).click();
  await expect(page.getByRole("status")).toContainText("Post saved");
  const after = page.locator("section").filter({ has: page.getByRole("button", { name: "Publish now" }) }).first();
  await after.locator('input[name="when"]').fill("2031-01-01T10:00");
  await after.getByRole("button", { name: "Schedule" }).click();
  await expect(page.getByRole("status")).toContainText("Post scheduled");
  await page.locator("section").filter({ has: page.getByRole("button", { name: "Publish now" }) }).first().getByRole("button", { name: "Publish now" }).click();
  await expect(page.getByRole("status")).toContainText("are not connected, so nothing was posted");
});

test("a time in the past is refused", async ({ page }) => {
  await page.goto("/admin/marketing");
  const draft = page.locator("section").filter({ has: page.getByRole("button", { name: "Schedule" }) }).first();
  await draft.locator('input[name="when"]').fill("2020-01-01T10:00");
  await draft.getByRole("button", { name: "Schedule" }).click();
  await expect(page.getByRole("status")).toContainText("Choose a time that has not passed");
});

test("plan an ad, and starting it says ads are not connected", async ({ page }) => {
  await page.goto("/admin/marketing?tab=ads");
  await page.locator('input[name="name"]').fill("E2E test ad");
  await page.locator('select[name="carSlug"]').selectOption({ index: 1 });
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Ad saved as a draft");
  const row = page.getByRole("row", { name: /E2E test ad/ });
  await row.getByRole("button", { name: "Start" }).click();
  await expect(page.getByRole("status")).toContainText("Ads are not connected");
  await expect(page.getByRole("row", { name: /E2E test ad/ })).toContainText("Draft");
  await page.getByRole("row", { name: /E2E test ad/ }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("row", { name: /E2E test ad/ })).toHaveCount(0);
});

test("write a newsletter from the newest cars, and sending says it is not connected", async ({ page }) => {
  await page.goto("/admin/marketing?tab=newsletters");
  await page.getByRole("button", { name: "Write from the newest cars" }).click();
  await expect(page.getByRole("status")).toContainText("Newsletter draft saved");
  await expect(page.getByText("New in this week:").first()).toBeVisible();
  await page.getByRole("button", { name: /^Send to/ }).first().click();
  await expect(page.getByRole("status")).toContainText("Newsletter sending is not connected");
});

test("an unknown notice code shows nothing", async ({ page }) => {
  await page.goto("/admin/marketing?notice=<script>alert(1)</script>");
  await expect(page.getByRole("status")).toHaveCount(0);
});
