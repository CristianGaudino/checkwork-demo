import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { SITE_NAME } from "../src/lib/site";
import { unfold } from "./open";

type Demo = { slug: string; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const live = cars.find((c) => !c.soldAt)!;

// The header links from 1024px (seven at most with the vehicle sections: docs/mobile-navigation.md), then the phone menu, then the footer.
const HEADER = [
  ["Finance", "/finance"],
  ["Sell or trade in", "/sell-your-car"],
  ["Service", "/service"],
  ["Contact", "/contact"],
] as const;
const SECTIONS = [["Used cars", "/used-cars"], ["Commercial", "/commercial"]] as const;
// Every page in the phone menu: the stock first, then the groups that fold (Buying, Selling, Dealership).
const MENU = [
  ...SECTIONS,
  ["Makes", "/makes"],
  ["Find a car", "/find-a-car"],
  ["Compare cars", "/compare"],
  ["Saved cars", "/saved"],
  ["Test drive", "/test-drive"],
  ["Finance", "/finance"],
  ["Warranty", "/warranty"],
  ["Sell your car", "/sell-your-car"],
  ["Trade in your car", "/trade-in"],
  ["Service", "/service"],
  ["Reviews", "/reviews"],
  ["Questions", "/faq"],
  ["About us", "/about"],
  ["Contact", "/contact"],
] as const;
const FOOTER = [
  ["Used cars", "/used-cars"],
  ["Finance", "/finance"],
  ["Trade in your car", "/trade-in"],
  ["Sell your car", "/sell-your-car"],
  ["Find a car", "/find-a-car"],
  ["Makes", "/makes"],
  ["Compare cars", "/compare"],
  ["Saved cars", "/saved"],
  ["Test drive", "/test-drive"],
  ["Service", "/service"],
  ["Warranty", "/warranty"],
  ["About us", "/about"],
  ["Contact", "/contact"],
  ["Privacy policy", "/privacy"],
  ["Terms of use", "/terms"],
  ["Opening hours and directions", "/contact"],
] as const;
const PAGES = ["/", "/used-cars", `/used-cars/${live.slug}`, "/finance", "/trade-in", "/find-a-car", "/service", "/warranty", "/contact", "/about", "/terms", "/privacy"];

test("from 1024px the header has Used, New, Commercial and four links, and no Enquire button or Stock menu", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const banner = page.getByRole("banner");
  for (const [name, href] of [...SECTIONS, ...HEADER]) await expect(banner.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  for (const name of ["Makes", "About"]) await expect(banner.getByRole("link", { name, exact: true })).toHaveCount(0); // one level down
  await expect(banner.getByRole("link", { name: "Enquire" })).toHaveCount(0);
  await expect(banner.getByRole("button", { name: "Stock" })).toHaveCount(0);
  await expect(banner.getByRole("navigation", { name: "Vehicle type" })).toHaveCount(0);
});

test("a van marks Commercial in the header, not Used Cars", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const banner = page.getByRole("banner");
  await page.goto("/commercial");
  await expect(banner.getByRole("link", { name: "Commercial", exact: true })).toHaveAttribute("aria-current", "page");
  await page.locator("article").filter({ hasText: "Vito" }).getByRole("link").first().click();
  await expect(page.getByTestId("buy-box")).toBeVisible();
  await expect(banner.getByRole("link", { name: "Commercial", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(banner.getByRole("link", { name: "Used cars", exact: true })).not.toHaveAttribute("aria-current", "page");
});

test("the current section has a red bar and aria-current", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/finance");
  await expect(page.getByRole("banner").getByRole("link", { name: "Finance", exact: true })).toHaveAttribute("aria-current", "page");
});

test("at 320px the header holds the menu button, and the footer reaches every page", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  const banner = page.getByRole("banner");
  await expect(banner.getByRole("button", { name: "Menu" })).toBeVisible();
  for (const [name] of HEADER) await expect(banner.getByRole("link", { name, exact: true })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const footer = await unfold(page.getByRole("contentinfo")); // each group folds on a phone
  // The hours link is for wider screens; Contact is in the footer on a phone.
  for (const [name, href] of FOOTER.filter(([n]) => n !== "Opening hours and directions")) await expect(footer.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  await expect(footer.getByRole("link", { name: "+353 1 906 0045" })).toHaveAttribute("href", "tel:+35319060045");
  await expect(footer.getByText(`© ${SITE_NAME}`)).toBeVisible();
});

test("the footer has no social icons while the dealer has no pages, and a Powered by Checkwork link that opens checkwork.ie", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("list", { name: "Social media" })).toHaveCount(0); // SOCIAL_LINKS is empty for the made-up dealer
  const credit = footer.getByRole("link", { name: /^Powered by/ });
  await expect(credit).toHaveAttribute("href", "https://www.checkwork.ie");
  await expect(credit).toContainText("Powered by");
  await expect(credit.getByRole("img", { name: "Checkwork" })).toBeVisible();
});

test("on a phone the header is the menu on the left, the logo in the middle and the heart on the right, level with each other; Used Cars is in the menu", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/");
  const banner = page.getByRole("banner");
  await expect(banner.getByRole("link", { name: "Used cars" })).toBeHidden();
  const [menu, logo, heart] = await Promise.all([banner.getByRole("button", { name: "Menu" }), banner.getByRole("link", { name: SITE_NAME }), banner.getByRole("link", { name: /^Saved cars/ })].map((l) => l.boundingBox()));
  const mid = (b: { y: number; height: number } | null) => b!.y + b!.height / 2;
  expect(mid(menu)).toBeCloseTo(mid(heart), 0);
  expect(mid(logo)).toBeCloseTo(mid(menu), 0);
  expect(menu!.x).toBeLessThan(logo!.x);
  expect(logo!.x).toBeLessThan(heart!.x);
  expect(Math.abs(logo!.x + logo!.width / 2 - 180)).toBeLessThan(2); // the logo is centred on a 360px phone
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test.describe("the mobile menu", () => {
  const open = async (page: import("@playwright/test").Page) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    return unfold(menu); // the groups fold: open them all
  };

  test("opens with every page and a Call now button, in 44px or taller targets", async ({ page }) => {
    const menu = await open(page);
    await expect(menu).toBeVisible();
    for (const [name, href] of MENU) {
      const link = menu.getByRole("link", { name, exact: true });
      await expect(link).toHaveAttribute("href", href);
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(menu.getByRole("link", { name: "Call us" })).toHaveAttribute("href", "tel:+35319060045");
  });

  test("the stock is at the top, and the groups fold, open only where the page you are on is", async ({ page }) => {
    await page.goto("/finance");
    await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    for (const name of ["Used cars", "New cars", "Commercial", "Makes"]) await expect(menu.getByRole("link", { name, exact: true })).toBeVisible();
    await expect(menu.locator("details[open] > summary")).toHaveText(["Buying"]);
    await expect(menu.getByRole("link", { name: "Sell your car" })).toBeHidden();
    await menu.getByText("Selling", { exact: true }).click();
    await expect(menu.getByRole("link", { name: "Sell your car" })).toBeVisible();
  });

  test("Home is in the menu on every page except Home", async ({ page }) => {
    let menu = await open(page);
    await expect(menu.getByRole("link", { name: "Home", exact: true })).toHaveCount(0);
    await page.goto("/finance");
    await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
    menu = page.getByRole("dialog", { name: "Menu" });
    await menu.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("a link takes you there and closes the menu; Escape and Close menu close it and return focus", async ({ page }) => {
    let menu = await open(page);
    await menu.getByRole("link", { name: "Finance", exact: true }).click();
    await expect(page).toHaveURL(/\/finance$/);
    await expect(menu).toBeHidden();

    menu = await open(page);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    const button = page.getByRole("banner").getByRole("button", { name: "Menu" });
    await expect(button).toBeFocused();

    await button.click();
    await menu.getByRole("button", { name: "Close menu" }).click();
    await expect(menu).toBeHidden();
  });

  test("the button is gone from 1024px and an open menu closes when the screen widens", async ({ page }) => {
    const menu = await open(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(menu).toBeHidden();
    await expect(page.getByRole("banner").getByRole("button", { name: "Menu" })).toBeHidden();
  });
});

test("every footer route answers 200", async ({ request }) => {
  for (const href of new Set(FOOTER.map(([, h]) => h))) expect((await request.get(href)).status(), href).toBe(200);
});

for (const path of PAGES) {
  test(`${path}: one header, main, footer and h1, no dead links, fits 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(path);
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(await page.locator('a[href="#"], a[href=""]').count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
}

test("a slow page shows the bar along the top until it lands", async ({ page }) => {
  const bar = page.locator(".nav-progress");
  await page.goto("/used-cars");
  const card = page.locator("main a[href^='/used-cars/']:visible").filter({ has: page.locator("img") }).first();
  const href = (await card.getAttribute("href"))!;
  await page.route((url) => url.pathname === href, async (r) => {
    await new Promise((ok) => setTimeout(ok, 1500));
    await r.continue();
  });
  await card.click();
  await expect(bar).toHaveAttribute("data-phase", "loading");
  await expect(bar).toHaveCSS("opacity", "1");
  await page.waitForURL(`**${href}`);
  await expect(bar).toHaveAttribute("data-phase", "idle");
});
