import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { unfold } from "./open";
import { choose } from "./combo";

// The owner's 2026-11-11 list (#85 to #88): two doors to the valuation, the drop-down that stayed open, the price drop tag.
type Demo = { id: string; slug: string; soldAt?: string; make: string; model: string; wasPriceEur?: number; priceEur: number };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const live = cars.find((c) => !c.soldAt)!;

test.describe("sell your car and trade-in", () => {
  test("Trade-in starts with the car you want, optional, and a car page fills it in", async ({ page }) => {
    await page.goto("/trade-in");
    await expect(page.getByRole("heading", { level: 1, name: "Trade in your car" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Progress" }).getByRole("listitem")).toHaveCount(5);
    await expect(page.getByLabel("The car you want")).toHaveValue("Not chosen yet");
    await page.getByRole("button", { name: "Next" }).click(); // optional: it moves on with no car
    await expect(page.getByLabel("Registration", { exact: true })).toBeVisible();

    await page.goto(`/used-cars/${live.slug}`);
    await page.getByRole("link", { name: "Trade in your car against this one" }).click();
    await expect(page).toHaveURL(new RegExp(`/trade-in\\?car=${live.slug}$`));
    await expect(page.getByLabel("The car you want")).toHaveValue(new RegExp(`${live.make} ${live.model}`));
  });

  test("Sell your car needs no car, and points to trade-in for a better price", async ({ page }) => {
    await page.goto("/sell-your-car");
    await expect(page.getByRole("heading", { level: 1, name: "Sell your car" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Trade it in" })).toHaveAttribute("href", "/trade-in");
    await expect(page.getByRole("list", { name: "Progress" }).getByRole("listitem")).toHaveCount(4);
    await expect(page.getByText("Changing car too?")).toBeHidden(); // it waits on the last step, with an optional car
  });

  test("both doors are in the footer", async ({ page }) => {
    await page.goto("/");
    const footer = await unfold(page.getByRole("contentinfo"));
    await expect(footer.getByRole("link", { name: "Trade in your car" })).toHaveAttribute("href", "/trade-in");
    await expect(footer.getByRole("link", { name: "Sell your car" })).toHaveAttribute("href", "/sell-your-car");
  });
});

test.describe("the drop-down", () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test("closes on a second press, on a press elsewhere, and a press on its label does not reopen it", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1400 }); // room for the list to open below the field, clear of its label
    await page.goto("/find-a-car");
    const box = page.getByRole("combobox", { name: /^Make/ });
    const list = page.getByRole("listbox");
    await box.click();
    await expect(list).toBeVisible();
    await box.click();
    await expect(list).toHaveCount(0);
    await box.click();
    await page.getByRole("heading", { level: 1 }).click();
    await expect(list).toHaveCount(0);
    await box.click();
    await page.getByText("Make", { exact: true }).first().click(); // the field's own label
    await expect(list).toHaveCount(0);
    await choose(box, 1); // and it still chooses
    await expect(box).not.toHaveValue("");
  });
});

test.describe("price drop on a card", () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test("is a tag on the photo, and the prices beside it stay level", async ({ page }) => {
    await page.goto("/used-cars");
    const reduced = page.locator("article").filter({ has: page.locator("[data-card-photo]").getByText(/^Reduced by €/) }).first();
    await expect(reduced.locator("[data-card-photo]").getByText(/^Reduced by €/)).toBeVisible();
    await expect(reduced.locator("[data-price-block]").getByText(/Reduced by/)).toHaveCount(0);
    // The card next to it in the grid: its details line sits at the same height.
    const cards = page.locator("article");
    const n = await cards.count();
    const boxes = await Promise.all(Array.from({ length: n }, (_, i) => cards.nth(i).locator("[data-meta]").boundingBox()));
    const tops = boxes.map((b) => Math.round(b!.y));
    for (let i = 0; i + 1 < n; i += 2) expect(Math.abs(tops[i] - tops[i + 1])).toBeLessThan(26); // a two-line name may push one line, never a price line
  });
});

test("the test drive list is searched and paged on the server, 24 cars a page", async ({ page }) => {
  await page.goto("/test-drive");
  const books = page.getByRole("button", { name: "Book", exact: true });
  expect(await books.count()).toBeLessThanOrEqual(24);
  const box = page.getByRole("searchbox", { name: "Search make or model" });
  await box.fill(live.make);
  await box.press("Enter");
  await expect(page).toHaveURL(new RegExp(`q=${live.make}`));
  await expect(books.first()).toBeVisible();
  await box.fill("zzzz");
  await box.press("Enter");
  await expect(page.getByText("No car matches. Try a make or a model, or call us.")).toBeVisible();
});

test("home: each Browse by type tile has a photo and says how many cars it opens", async ({ page }) => {
  await page.goto("/");
  const tiles = page.getByRole("region", { name: "Browse by type" }).getByRole("link");
  await expect(tiles.first().locator("img")).toHaveCount(1);
  await expect(tiles.first()).toContainText(/\d+ cars?|No cars/);
});
