import { expect, test } from "@playwright/test";
import { DEALER_NAV, PLATFORM_NAV } from "../src/lib/admin/nav";

// The dealer and platform areas: their own frame, every nav link alive, no public header or footer, nothing wider than a phone.
for (const [area, nav] of [["dealer admin", DEALER_NAV], ["platform", PLATFORM_NAV]] as const) {
  test(`${area}: every nav link opens a page with one h1, and the public header and footer are not there`, async ({ page }) => {
    await page.goto(nav[0].href);
    await expect(page.getByRole("banner")).toHaveCount(0);
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
    const side = page.getByRole("navigation", { name: area === "platform" ? "Platform" : "Dealer admin" });
    for (const item of nav) {
      await side.getByRole("link", { name: item.label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${item.href}$`));
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(side.getByRole("link", { name: item.label, exact: true })).toHaveAttribute("aria-current", "page");
    }
  });

  test(`${area}: no sideways scroll at 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    for (const item of nav) {
      await page.goto(item.href);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), item.href).toBeLessThanOrEqual(320);
    }
  });

  test(`${area}: is not indexed`, async ({ page }) => {
    await page.goto(nav[0].href);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
}
