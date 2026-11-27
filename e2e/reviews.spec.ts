import { expect, test } from "@playwright/test";
import { directionsUrl } from "../src/lib/dealer";

const strip = (page: import("@playwright/test").Page) => page.getByRole("group", { name: "Google reviews" });

test("the home page shows ten demo reviews, with no Demo label, with Google Maps attribution", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What customers say" })).toBeVisible();
  await expect(page.getByText("Demo reviews")).toHaveCount(0);
  await expect(page.getByText("Showing the most relevant reviews from Google Maps.")).toBeVisible();
  const cards = strip(page).locator("article");
  await expect(cards).toHaveCount(10);
  for (const card of await cards.all()) {
    await expect(card).toContainText("Google Maps");
    const link = card.locator('a[href^="https://www.google.com/maps/"]');
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
});

test("the aggregate rating, See all and the review policy link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Rated 4.9 out of 5 from 10 Google reviews")).toBeAttached();
  const all = page.getByRole("link", { name: "See all on Google Maps" });
  await expect(all).toHaveAttribute("href", directionsUrl()); // the demo dealer's address, not a listing of its own
  await expect(all).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: /Google's review policy/ })).toHaveAttribute("href", "https://support.google.com/contributionpolicy/answer/7422880");
});

test("at 320px only the review strip scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const { scrollWidth, clientWidth } = await strip(page).locator("ul").evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
  expect(scrollWidth).toBeGreaterThan(clientWidth);
});

test("at 1280px four reviews show across", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const visible = await strip(page).locator("article").evaluateAll((els) => els.filter((e) => e.checkVisibility()).length);
  expect(visible).toBeGreaterThan(3); // more than three show at once
});

// A row just over a screen wide is still more than one page, and Next goes on until the last card is in full view (#288).
for (const width of [1280, 800]) {
  test(`at ${width}px the reviews row has Pause, and Next reaches the last review`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const row = strip(page);
    const list = row.locator("ul").first();
    await row.scrollIntoViewIfNeeded();
    await row.getByRole("button", { name: "Pause reviews" }).click();
    await expect(row.getByRole("button", { name: "Play reviews" })).toBeVisible();
    await list.evaluate((el) => el.scrollTo({ left: 0, behavior: "instant" }));
    const next = row.getByRole("button", { name: "Next reviews" });
    const current = row.locator('[aria-current="true"]');
    for (let i = 0; i < 20 && (await next.evaluate((b) => getComputedStyle(b).pointerEvents)) !== "none"; i++) {
      const at = await current.getAttribute("aria-label");
      await next.click();
      await expect(current).not.toHaveAttribute("aria-label", at!);
      const left = () => list.evaluate((el) => el.scrollLeft);
      await expect.poll(async () => (await left()) === (await page.waitForTimeout(100), await left())).toBe(true); // the smooth scroll has stopped
    }
    const inView = () => list.evaluate((el) => el.lastElementChild!.getBoundingClientRect().right <= el.getBoundingClientRect().right + 1);
    await expect.poll(inView).toBe(true);
  });
}

test("on a phone the row has Pause, and with reduced motion no row of controls at all", async ({ page }) => {
  await page.goto("/");
  const pause = strip(page).getByRole("button", { name: "Pause reviews" });
  await expect(pause).toBeVisible();
  expect((await pause.boundingBox())!.height).toBeGreaterThanOrEqual(44); // a thumb's target
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(strip(page).getByRole("button", { name: "Pause reviews" })).toHaveCount(0);
  await expect(strip(page).locator("ul + div")).toBeHidden();
});
