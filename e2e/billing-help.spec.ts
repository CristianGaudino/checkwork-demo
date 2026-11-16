import { expect, test } from "@playwright/test";
import { as } from "./open";
import { SHOW_PRICING } from "@/lib/billing/rules";

// Last month: the seed always holds its bill (src/lib/billing/bills.ts).
const lastMonth = (() => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 7); })();

// Billing is for the owner and manager; Help is for everyone. The demo bar's role is a cookie (see admin-margins.spec.ts).

test("the owner sees the plan, sets a limit and an alert, and opens a bill", async ({ page }) => {
  test.skip(!SHOW_PRICING, "pricing is hidden for now (SHOW_PRICING)");
  await page.goto("/dashboard/billing");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Billing");
  await expect(page.getByText(/Founding dealer: 30% off until/)).toBeVisible();
  await expect(page.getByText("Estimate").first()).toBeVisible();

  await page.getByRole("link", { name: "Limits", exact: true }).click();
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

test("with our prices hidden, the owner still has Billing: the plan and its modules, AI writing and the details, and no euro anywhere", async ({ page }) => {
  test.skip(SHOW_PRICING, "only while pricing is hidden");
  await page.goto("/dashboard/billing");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: /^Your plan: / })).toBeVisible();
  await expect(main.getByRole("button", { name: "Premium" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Billing details" })).toBeVisible();
  await expect(main).not.toContainText("€");
  expect((await page.request.get(`/dashboard/billing/${lastMonth}`)).status()).toBe(404);
});

test("sales has no Billing page", async ({ page, context }) => {
  await as(context, "Sales");
  expect((await page.request.get("/dashboard/billing")).status()).toBe(404);
  expect((await page.request.get(`/dashboard/billing/${lastMonth}`)).status()).toBe(404);
});

test("a help request is sent and shows in the list with its page", async ({ page, context }) => {
  await as(context, "Sales");
  // A link from a page (as Billing's) says which page it came from; the menu's Help says none.
  await page.goto("/dashboard/help?from=%2Fdashboard%2Fstock");
  await expect(page.getByRole("link", { name: /Call/ })).toHaveAttribute("href", "tel:+35319060099");
  const text = `Where do I change a price ${Date.now()}`;
  await page.getByLabel("Your message").fill(text);
  await page.getByRole("button", { name: "Send" }).first().click();
  await expect(page.getByRole("status").filter({ hasText: "Sent" })).toBeVisible();
  const item = page.getByRole("listitem").filter({ hasText: text });
  await expect(item).toContainText("Received");
  await expect(item).toContainText("From Stock");
});
