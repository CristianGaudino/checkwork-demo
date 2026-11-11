import { expect, test } from "@playwright/test";

// Follow-ups on leads, and the sales the DoneDeal sync leaves to record.
test("a follow-up set on a lead shows on the lead and in the list's Follow-ups due once due, and can be cleared", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dashboard/leads/lead-edge-1"); // an open lead no other spec changes
  const panel = page.getByRole("region", { name: "Follow up" });
  await panel.getByRole("button", { name: "Tomorrow" }).click();
  await expect(panel).not.toContainText("Today");
  await expect(panel.getByRole("button", { name: "Clear the follow-up" })).toBeVisible();
  // Not due yet: not in Follow-ups due.
  await page.goto("/dashboard/leads?due=1");
  await expect(page.getByRole("row", { name: /Aleksandra/ })).toHaveCount(0);
  // Today: due.
  await page.goto("/dashboard/leads/lead-edge-1");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
  await panel.getByLabel("Or a day").fill(today);
  await panel.getByRole("button", { name: "Set" }).click();
  await expect(panel).toContainText("Today");
  await page.goto("/dashboard/leads?due=1");
  await expect(page.getByRole("row", { name: /Aleksandra/ })).toContainText("Today");
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /Follow-ups due/ })).toBeVisible();
  await page.goto("/dashboard/leads/lead-edge-1");
  await panel.getByRole("button", { name: "Clear the follow-up" }).click();
  await expect(panel.getByRole("button", { name: "Clear the follow-up" })).toHaveCount(0);
});

test("in the DoneDeal version a sold car's sale is asked for and recorded with a customer on file", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await context.addCookies([{ name: "checkwork-demo-stock", value: "donedeal", url: "http://localhost:3000" }]);
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /Sold cars with no sale recorded/ })).toBeVisible();
  await page.goto("/dashboard/stock?view=sold");
  const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: "Record sale" }) }).first();
  await row.getByRole("link", { name: "Record sale" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Record the sale");
  await page.getByLabel("Buyer").click();
  await page.getByRole("listbox").getByRole("option").nth(1).click(); // a customer on file
  await expect(page.getByLabel("Name", { exact: true })).toHaveCount(0); // no new-customer boxes
  await page.getByRole("button", { name: "Record sale" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Sale recorded for/ })).toBeVisible(); // beside the sync's own status
});
