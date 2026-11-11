import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

type Demo = { slug: string; year: number; mileageKm?: number; owners?: number; soldAt?: string; condition?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
// The demo's one rare car: ten years or more and one owner from new.
const rare = cars.find((c) => !c.soldAt && (c.condition ?? "used") === "used" && c.owners === 1 && new Date().getUTCFullYear() - c.year >= 10);
const plain = cars.find((c) => !c.soldAt && c.mileageKm && c !== rare)!;

test("a rare car carries its marker on the card and the car page; an ordinary one carries none", async ({ page }) => {
  test.skip(!rare, "no rare car in the demo stock");
  await page.goto(`/used-cars/${rare!.slug}`);
  await expect(page.getByTestId("buy-box").getByText("One owner from new")).toBeVisible();
  await page.goto(`/used-cars/${plain.slug}`);
  await expect(page.getByTestId("buy-box").getByText(/One owner from new|Very low mileage/)).toHaveCount(0);
});

test.describe("on a desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test("km or miles: one switch changes every mileage on the page, and the choice is remembered", async ({ page }) => {
    await page.goto(`/used-cars/${plain.slug}`);
    const km = new Intl.NumberFormat("en-IE").format(plain.mileageKm!);
    const miles = new Intl.NumberFormat("en-IE").format(Math.round(plain.mileageKm! / 1.609344));
    await expect(page.getByTestId("buy-box").getByText(`${km} km`).first()).toBeVisible();
    await page.getByRole("group", { name: "Mileage in" }).getByRole("button", { name: "miles" }).click();
    await expect(page.getByTestId("buy-box").getByText(`${miles} miles`).first()).toBeVisible();
    // The buy box and the specifications follow the switch; the dealer's own description keeps its words.
    await expect(page.getByTestId("buy-box").getByText(`${km} km`)).toHaveCount(0);
    await expect(page.locator("dl").getByText(`${km} km`)).toHaveCount(0);
    await page.goto("/used-cars");
    await expect(page.locator("article [data-meta]").first()).toContainText("miles");
    await page.getByRole("group", { name: "Mileage in" }).getByRole("button", { name: "km" }).click();
    await expect(page.locator("article [data-meta]").first()).toContainText(" km");
  });
});
