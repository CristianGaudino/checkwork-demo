import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Large text (Android font scale, iOS Dynamic Type): no public page scrolls sideways at 360px with 150% root text, or at 320px with 200% (#277).
const ROUTES = ["/", "/used-cars", "/commercial", "/makes", "/reviews", "/faq", "/contact", "/about", "/finance", "/trade-in", "/sell-your-car", "/find-a-car", "/test-drive", "/service", "/warranty", "/saved", "/compare", "/privacy", "/terms"];

const enlarge = (page: Page, size = "150%") => page.evaluate((s) => (document.documentElement.style.fontSize = s), size);
// clientWidth, not innerWidth: on the emulated phone the layout viewport grows to fit what overflows.
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const firstCar = async (page: Page) => {
  await page.goto("/used-cars");
  return (await page.locator("article h2 a").first().getAttribute("href"))!;
};

test.use({ viewport: { width: 360, height: 800 } });

for (const [width, size] of [[360, "150%"], [320, "200%"], [412, "200%"]] as const) {
  test(`no public page scrolls sideways at ${width}px with ${size} text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const path of [...ROUTES, await firstCar(page)]) {
      await page.goto(path);
      await page.waitForLoadState("load");
      await enlarge(page, size);
      expect.soft(await overflow(page), path).toBeLessThanOrEqual(0);
      // The car's title wraps between words, never past its own box.
      if (path.startsWith("/used-cars/")) expect.soft(await page.locator("h1").evaluate((el) => el.scrollWidth - el.clientWidth), `${path} h1`).toBeLessThanOrEqual(0);
    }
  });
}

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

test("on a car page at 360px with 150% text the call bar's two rows cover neither the compare pill nor the footer", async ({ page }) => {
  await page.goto(await firstCar(page));
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  await page.getByTestId("buy-box").getByRole("button", { name: /^Compare / }).click();
  await enlarge(page);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const bar = page.locator("[data-sticky-actions]");
  await expect(bar).not.toHaveClass(/invisible/);
  await expect(bar.getByRole("button", { name: "Enquire" })).toBeInViewport({ ratio: 1 });
  const top = (await bar.boundingBox())!.y;
  const pill = (await page.getByRole("region", { name: "Compare cars" }).boundingBox())!;
  const footer = (await page.locator("footer").boundingBox())!;
  expect(pill.y + pill.height).toBeLessThanOrEqual(top);
  expect(footer.y + footer.height).toBeLessThanOrEqual(top);
});

test("the pager's Next is whole and on screen at 320px with 200% text", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/used-cars");
  await enlarge(page, "200%");
  const next = page.getByRole("link", { name: "Next page" });
  await next.scrollIntoViewIfNeeded();
  await expect(next).toBeInViewport({ ratio: 1 });
  const list = (await page.getByRole("navigation", { name: "Pagination" }).getByRole("list").boundingBox())!;
  const box = (await next.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(list.x);
  expect(box.x + box.width).toBeLessThanOrEqual(list.x + list.width);
  await expect(page.getByRole("navigation", { name: "Pagination" }).locator("p", { hasText: "Page 1 of" })).toBeVisible(); // out of the box, on its own line
});

for (const [width, size] of [[640, "200%"], [700, "250%"]] as const) {
  test(`the pager on a later page fits at ${width}px with ${size} text, Previous and Next whole`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    // The test drive list pages with the same pager; its last page has no Next.
    for (const path of ["/used-cars?page=2", "/test-drive?page=2"]) {
      await page.goto(path);
      await enlarge(page, size);
      expect(await overflow(page), path).toBeLessThanOrEqual(0);
      for (const name of ["Previous page", "Next page"]) {
        const link = page.getByRole("link", { name });
        if (path.startsWith("/test-drive") && name === "Next page") continue;
        await link.scrollIntoViewIfNeeded();
        await expect(link, `${path} ${name}`).toBeInViewport({ ratio: 1 });
      }
    }
  });
}
