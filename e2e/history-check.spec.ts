import { expect, test } from "@playwright/test";

// The history check on the demo: simulated, so a clear used car shows it under the price, and one with a problem shows nothing.
test("a clear used car shows History checked, opening the report; one with finance owed shows nothing", async ({ page }) => {
  await page.goto("/used-cars/toyota-yaris-2015-4710002");
  const badge = page.getByTestId("history-check");
  await badge.getByText("History checked").click();
  await expect(badge).toContainText("Finance owed");
  await expect(badge).toContainText("None");
  await expect(badge).not.toContainText(/demo|simulated/i);
  await page.goto("/used-cars/volvo-xc60-2011-4710027");
  await expect(page.getByTestId("buy-box")).toBeVisible();
  await expect(page.getByTestId("history-check")).toHaveCount(0);
});

test("the dashboard shows the check, why a car with a problem has none on the site, and checks again", async ({ page }) => {
  await page.goto("/dashboard/stock/4710027");
  const panel = page.getByRole("region", { name: "History check" });
  await expect(panel).toContainText("Finance is owed on it");
  await panel.getByRole("button", { name: "Check again" }).click();
  await page.waitForURL(/history=done/);
  await expect(page.getByRole("region", { name: "History check" })).toContainText("Checked.");
});
