import { expect, test } from "@playwright/test";
import { DEALER_NAV } from "../src/lib/admin/nav";
import { sideLink, sideMenu } from "./admin-menu";
import { as } from "./open";

// The dealer area: its own frame, every nav link alive, no public header or footer, nothing wider than a phone. A dealer without a
// permission does not get the entries that need one (see admin-margins.spec.ts for those).
const nav = DEALER_NAV.filter((i) => !i.permission);

test("dealer admin: every nav link opens a page with one h1, and the public header and footer are not there", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 }); // the sidebar; the phone tab bar is the next test
  await page.goto(nav[0].href);
  await expect(page.getByRole("banner")).toHaveCount(0);
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
  for (const item of nav) {
    await (await sideLink(page, item.label)).click();
    await expect(page).toHaveURL(new RegExp(`${item.href}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(sideMenu(page).getByRole("link", { name: item.label, exact: true })).toHaveAttribute("aria-current", "page");
  }
});

test("the sidebar stays in place while the page scrolls, and its groups fold, remembered across pages", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/dashboard/settings");
  const side = sideMenu(page);
  // The everyday places are always there, never in a group; the page you are on opens its group; Customers starts open.
  for (const label of ["Leads", "Test drives", "Stock", "Posts and emails"]) await expect(side.getByRole("link", { name: label, exact: true })).toBeVisible();
  await expect(side.getByRole("button", { name: "Settings and help", exact: true })).toHaveAttribute("aria-expanded", "true");
  await expect(side.getByRole("button", { name: "Customers", exact: true })).toHaveAttribute("aria-expanded", "true");
  await expect(side.getByRole("button", { name: "Results", exact: true })).toHaveAttribute("aria-expanded", "false");
  await expect(side.getByRole("link", { name: "Analytics", exact: true })).toBeHidden(); // shut: out of reach, not only out of sight
  // Fold Customers, and it stays folded on the next page, drawn that way by the server.
  await side.getByRole("button", { name: "Customers", exact: true }).click();
  await expect(side.getByRole("link", { name: "Reviews", exact: true })).toBeHidden();
  await page.goto("/dashboard/analytics");
  await expect(side.getByRole("button", { name: "Customers", exact: true })).toHaveAttribute("aria-expanded", "false");
  // Scrolled to the foot of a long page, the menu has not moved.
  const top = (await side.boundingBox())!.y;
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect((await side.boundingBox())!.y).toBeCloseTo(top, 0); // to the pixel: the emulated phone rounds a quarter pixel
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

test("on a tablet the demo bar never covers the tab bar: in the dashboard it stays a pill until 1024px", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto("/dashboard");
  const tabs = page.getByRole("navigation", { name: "Dealer dashboard" });
  const pill = page.locator("[data-demo-bar]").getByRole("button", { name: /^Demo/ });
  await expect(tabs.getByRole("link", { name: "Leads" })).toBeVisible();
  await expect(pill).toBeVisible();
  const bar = (await tabs.boundingBox())!;
  const p = (await pill.boundingBox())!;
  expect(p.y + p.height).toBeLessThanOrEqual(bar.y); // the pill sits above the tab bar
  const top = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("nav")?.getAttribute("aria-label"), { x: bar.x + bar.width / 2, y: bar.y + bar.height / 2 });
  expect(top).toBe("Dealer dashboard"); // nothing lies over the tab bar
});

test("a dashboard page that is not there keeps the dashboard's menu and leads back to the overview", async ({ page, context }) => {
  await as(context, "Sales");
  // A page this role cannot open, a deleted record and a mistyped address all answer the same way.
  for (const path of ["/dashboard/margins", "/dashboard/leads/lead-no-such", "/dashboard/no-such-page"]) {
    const res = await page.goto(path);
    expect(res!.status(), path).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We couldn't find that page");
    await expect(page.getByRole("navigation", { name: "Dealer dashboard" })).toBeVisible(); // the tab bar on a phone
    await expect(page.getByRole("link", { name: "See all used cars" })).toHaveCount(0); // not the public page
  }
  await page.getByRole("link", { name: "Back to the overview" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
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
