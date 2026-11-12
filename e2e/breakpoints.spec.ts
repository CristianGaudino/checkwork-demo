import { expect, test } from "@playwright/test";

// The gaps between layouts: at every breakpoint edge there is a way round (the header links or the menu; the sidebar or the tab bar),
// nothing scrolls sideways, and no two fixed bars at the foot of the screen lie over each other (the demo bar once covered the
// dashboard's tab bar between 640 and 1023px).
const EDGES = [320, 639, 640, 767, 768, 1023, 1024, 1279, 1280, 1440];

const fixedOverlaps = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const shown = (el: Element) => getComputedStyle(el).display !== "none" && el.getBoundingClientRect().height > 0 && !el.closest("dialog");
    const layers = [...document.querySelectorAll("body *")].filter((el) => getComputedStyle(el).position === "fixed" && shown(el) && !el.closest("[data-dev-toggle]"));
    const outer = layers.filter((el) => !layers.some((o) => o !== el && o.contains(el)));
    const paints = (el: Element) => [el, ...el.querySelectorAll("*")].some((x) => shown(x) && getComputedStyle(x).backgroundColor !== "rgba(0, 0, 0, 0)");
    const hits: string[] = [];
    for (let i = 0; i < outer.length; i++)
      for (let j = i + 1; j < outer.length; j++) {
        const a = outer[i].getBoundingClientRect(), b = outer[j].getBoundingClientRect();
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1 && paints(outer[i]) && paints(outer[j])) hits.push(`${outer[i].tagName} / ${outer[j].tagName}`);
      }
    return hits;
  });

for (const [path, nav] of [
  ["/", (page: import("@playwright/test").Page) => page.getByRole("banner").getByRole("link", { name: "Used cars", exact: true }).or(page.getByRole("banner").getByRole("button", { name: "Menu" }))],
  ["/dashboard", (page: import("@playwright/test").Page) => page.getByRole("navigation", { name: "Dealer dashboard" })],
] as const) {
  test(`${path}: a way round, no sideways scroll and no overlapping bars at every breakpoint edge`, async ({ page }) => {
    await page.goto(path);
    for (const width of EDGES) {
      await page.setViewportSize({ width, height: 800 });
      await expect(nav(page).first(), `${path} @${width}`).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${path} @${width}`).toBeLessThanOrEqual(0);
      expect(await fixedOverlaps(page), `${path} @${width}`).toEqual([]);
    }
  });
}
