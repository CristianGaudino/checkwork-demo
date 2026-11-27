import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

// A pressable's 0.97 press only animates while the shared base rule (globals.css) owns its transition: a transition utility on it would drop scale.
const transitionProperty = (el: Locator) => el.evaluate((e) => getComputedStyle(e).transitionProperty);

test("a filter chip in the sheet animates its press", async ({ page }) => {
  await page.goto("/used-cars");
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  await page.getByRole("button", { name: /^Filters/ }).click();
  const sheet = page.getByRole("dialog", { name: "Filters" });
  await expect(sheet).toBeVisible();
  expect(await sheet.evaluate((e) => getComputedStyle(e).transitionDuration)).toMatch(/^0\.25s/);
  expect(await transitionProperty(sheet.locator("button[aria-pressed]").first())).toContain("scale");
});

test("a make chip on the home page animates its press", async ({ page }) => {
  await page.goto("/");
  expect(await transitionProperty(page.getByRole("region", { name: "Browse by make" }).getByRole("listitem").first().getByRole("link"))).toContain("scale");
});

test("a make tile on /makes animates its press", async ({ page }) => {
  await page.goto("/makes");
  expect(await transitionProperty(page.getByRole("region", { name: "In stock" }).getByRole("link").first())).toContain("scale");
});

test.describe("on a desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test("the km or miles switch animates its press", async ({ page }) => {
    await page.goto("/used-cars");
    expect(await transitionProperty(page.getByRole("group", { name: "Mileage in" }).getByRole("button", { name: "miles" }))).toContain("scale");
  });
});

test("with reduced motion an .enter element only fades", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const property = await page.evaluate(() => {
    const el = document.createElement("div");
    el.className = "enter";
    document.body.append(el);
    return getComputedStyle(el).transitionProperty;
  });
  expect(property).toBe("opacity");
});
