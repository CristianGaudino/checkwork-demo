import { expect, test } from "@playwright/test";
import { DEALER_NAV } from "../src/lib/admin/nav";

// The dealer area: its own frame, every nav link alive, no public header or footer, nothing wider than a phone. A dealer without a
// permission does not get the entries that need one (see admin-margins.spec.ts for those).
const nav = DEALER_NAV.filter((i) => !i.permission);

test("dealer admin: every nav link opens a page with one h1, and the public header and footer are not there", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 }); // the sidebar; the phone tab bar is the next test
  await page.goto(nav[0].href);
  await expect(page.getByRole("banner")).toHaveCount(0);
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
  const side = page.getByRole("navigation", { name: "Dealer dashboard" });
  for (const item of nav) {
    await side.getByRole("link", { name: item.label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${item.href}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(side.getByRole("link", { name: item.label, exact: true })).toHaveAttribute("aria-current", "page");
  }
});

test("on a phone the dashboard has a tab bar: four places and More, which opens the rest; each marks the page you are on", async ({ page }) => {
  await page.goto("/dashboard");
  const tabs = page.getByRole("navigation", { name: "Dealer dashboard" });
  await expect(tabs.getByRole("link")).toHaveText(["Overview", "Leads", "Test drives", "Stock"]);
  await tabs.getByRole("link", { name: "Leads" }).click();
  await expect(page).toHaveURL(/\/dashboard\/leads$/);
  await expect(tabs.getByRole("link", { name: "Leads" })).toHaveAttribute("aria-current", "page");
  // More: the rest of the menu, in the sidebar's groups.
  const more = tabs.getByRole("button", { name: "More" });
  const sheet = page.getByRole("dialog", { name: "More" });
  await expect(async () => {
    await more.click();
    await expect(sheet).toBeVisible({ timeout: 1000 });
  }).toPass();
  const tabbed = ["/dashboard", "/dashboard/leads", "/dashboard/test-drives", "/dashboard/stock"];
  for (const item of nav.filter((i) => !tabbed.includes(i.href))) await expect(sheet.getByRole("link", { name: item.label, exact: true })).toBeVisible();
  await sheet.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings$/);
  await expect(sheet).toBeHidden();
  await expect(more).toHaveAttribute("aria-current", "page"); // Settings is one of More's
  // The page's last row clears the tab bar.
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  const bar = (await tabs.boundingBox())!;
  const last = (await page.locator("main > *").last().boundingBox())!;
  expect(last.y + last.height).toBeLessThanOrEqual(bar.y + 1);
});

test("dealer admin: no sideways scroll at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const item of nav) {
    await page.goto(item.href);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), item.href).toBeLessThanOrEqual(320);
  }
});

test("dealer admin: is not indexed", async ({ page }) => {
  await page.goto(nav[0].href);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("there is no platform area in a dealer's site", async ({ request }) => {
  expect((await request.get("/platform")).status()).toBe(404);
});

test("there is no /admin: the dashboard is /dashboard only", async ({ request }) => {
  expect((await request.get("/admin", { maxRedirects: 0 })).status()).toBe(404);
});
