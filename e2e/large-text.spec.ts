import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Large text (Android font scale, iOS Dynamic Type): at 360px with 150% root text no public page scrolls sideways (#277).
// The car page is left out here: its title, price and sticky bar are #276, and car-page.spec.ts covers it.
const ROUTES = ["/", "/used-cars", "/commercial", "/makes", "/reviews", "/faq", "/contact", "/about", "/finance", "/trade-in", "/sell-your-car", "/find-a-car", "/test-drive", "/service", "/warranty", "/saved", "/compare", "/privacy", "/terms"];

const enlarge = (page: Page) => page.evaluate(() => (document.documentElement.style.fontSize = "150%"));
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

test.use({ viewport: { width: 360, height: 800 } });

test("no public page scrolls sideways at 360px with 150% text", async ({ page }) => {
  for (const path of ROUTES) {
    await page.goto(path);
    await enlarge(page);
    expect(await overflow(page), path).toBeLessThanOrEqual(0);
  }
});

test("with three cars picked the compare pill fits at 360px with 150% text, its Hide button on screen", async ({ page }) => {
  await page.goto("/used-cars");
  const paths = await page.locator("article h2 a").evaluateAll((as) => as.slice(0, 3).map((a) => a.getAttribute("href")!));
  for (const p of paths) {
    await page.goto(p);
    // A tap before React attaches does nothing.
    await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
    await page.getByTestId("buy-box").getByRole("button", { name: /^Compare / }).click();
  }
  await page.goto("/used-cars");
  await enlarge(page);
  const bar = page.getByRole("region", { name: "Compare cars" });
  await expect(bar).toContainText("3 of 3 to compare");
  const box = (await bar.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  await expect(bar.getByRole("button", { name: "Hide" })).toBeInViewport({ ratio: 1 });
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});
