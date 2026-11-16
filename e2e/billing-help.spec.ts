import { expect, test } from "@playwright/test";

// Billing is for the owner and manager; Help is for everyone. The demo bar's role is a cookie (see admin-margins.spec.ts).
const as = (context: import("@playwright/test").BrowserContext, role: string) => context.addCookies([{ name: "checkwork-demo-role", value: role, url: "http://localhost:3000" }]);

test("the owner sees the plan, sets a limit and an alert, and opens a bill", async ({ page }) => {
  await page.goto("/dashboard/billing");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Billing");
  await expect(page.getByText(/Founding dealer: 30% off until/)).toBeVisible();
  await expect(page.getByText("Estimate").first()).toBeVisible();

  await page.getByRole("link", { name: "Limits and alerts" }).click();
  // High enough that the other specs' lookups, on the same server, never reach it.
  await page.getByLabel("Registration lookup limit (€ a month)").fill("120.50");
  await page.getByRole("button", { name: "Save limits" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Registration lookup limit (€ a month)")).toHaveValue("120.5");
  // Never above ours.
  await page.getByLabel("All usage limit (€ a month)").fill("151");
  await page.getByRole("button", { name: "Save limits" }).click();
  await expect(page.getByText("Our limit for your account is €150")).toBeVisible();

  await page.getByLabel("passes (€)").fill("33");
  await page.getByRole("button", { name: "Add alert" }).click();
  await expect(page.getByText("passes €33")).toBeVisible();

  await page.goto("/dashboard/billing?section=bills");
  await expect(page.getByText("Invoices are emailed as PDFs when each bill is issued.")).toBeVisible();
  await expect(page.getByRole("link", { name: /download/i })).toHaveCount(0);
  await page.getByRole("table").getByRole("link").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bill for");
  await expect(page.getByText("VAT at 23%")).toBeVisible();
  await expect(page.getByText("Founding dealer discount")).toBeVisible();
});

test("sales has no Billing page", async ({ page, context }) => {
  await as(context, "Sales");
  expect((await page.request.get("/dashboard/billing")).status()).toBe(404);
  expect((await page.request.get("/dashboard/billing/2026-01")).status()).toBe(404);
});

test("a help request is sent and shows in the list with its page", async ({ page, context }) => {
  await as(context, "Sales");
  await page.goto("/dashboard/stock");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("link", { name: "Need help?" }).click();
  await expect(page).toHaveURL(/\/dashboard\/help\?from=%2Fdashboard%2Fstock/);
  await expect(page.getByRole("link", { name: /Call/ })).toHaveAttribute("href", "tel:+35319060099");
  const text = `Where do I change a price ${Date.now()}`;
  await page.getByLabel("Your message").fill(text);
  await page.getByRole("button", { name: "Send" }).first().click();
  await expect(page.getByRole("status").filter({ hasText: "Sent" })).toBeVisible();
  const item = page.getByRole("listitem").filter({ hasText: text });
  await expect(item).toContainText("Received");
  await expect(item).toContainText("From stock");
});
