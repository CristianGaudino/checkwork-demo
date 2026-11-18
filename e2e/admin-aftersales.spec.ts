import { expect, test } from "@playwright/test";

// Aftersales: a customer's page lists what they bought with its warranty; a claim opens on a purchase and moves along. The website's
// Warranty page takes a claim too. Demo customer cust-300 bought one of the demo's recently sold cars (the sales seed).
test("a claim opens from a customer's purchase, in cover, and moves to Booked in", async ({ page }) => {
  await page.goto("/dashboard/customers/cust-300");
  const purchases = page.getByRole("region", { name: "Purchases" });
  await expect(purchases).toContainText("warranty until");
  await purchases.getByRole("link", { name: "Open a claim" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Open a claim");
  await page.getByLabel("The fault").fill("Engine light on since Monday");
  await page.getByRole("button", { name: "Open the claim" }).click();
  await expect(page).toHaveURL(/\/dashboard\/aftersales\/claim-/);
  await expect(page.getByRole("region", { name: "The fault" })).toContainText("Engine light on since Monday");
  await expect(page.getByText("In cover", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Booked in" }).click();
  await expect(page.getByRole("region", { name: "Status" }).getByText("Booked in", { exact: true }).first()).toBeVisible();
  await page.goto("/dashboard/aftersales?view=open");
  await expect(page.getByRole("row").filter({ hasText: "Booked in" }).first()).toBeVisible();
  // The customer's page lists the claim.
  await page.goto("/dashboard/customers/cust-300");
  await expect(page.getByRole("region", { name: "Warranty claims" })).toContainText("Engine light on since Monday");
});

test("the website's Warranty page has a claim form, and a lost lead asks why", async ({ page }) => {
  await page.goto("/warranty");
  const claim = page.locator("#claim");
  await expect(claim.getByLabel("Registration")).toBeVisible();
  await expect(claim.getByRole("button", { name: "Next", exact: true })).toBeVisible(); // the claim is two short steps, Send claim on the last

  await page.goto("/dashboard/leads/lead-edge-2"); // the seed's own edge case, which no other test changes
  await page.getByRole("button", { name: "Lost" }).click();
  await page.getByRole("button", { name: "Price" }).click();
  await expect(page.getByRole("button", { name: "Price" })).toHaveAttribute("aria-pressed", "true");
});
