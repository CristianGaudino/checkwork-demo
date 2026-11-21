import { expect, test } from "@playwright/test";
import { demoBar } from "./open";

test("the public site has no dealer tools: Dealer in the demo bar opens the dashboard; there is no Superuser", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); // the header links are from 1024px; the phone menu has its own check below
  await page.goto("/");
  const bar = page.locator("[data-demo-bar]");
  await expect(bar.getByRole("link", { name: "Customer" })).toHaveAttribute("aria-current", "true");
  await expect(bar.getByRole("link", { name: "Superuser" })).toHaveCount(0);
  await bar.getByRole("link", { name: "Dealer" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(bar.getByRole("link", { name: "Dealer" })).toHaveAttribute("aria-current", "true");
  await bar.getByRole("link", { name: "Customer" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("banner").getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  await page.goto("/used-cars");
  await page.locator("article").first().getByRole("link").first().click();
  await expect(page.getByTestId("buy-box")).toBeVisible();
  await expect(page.locator("[data-car-controls]")).toHaveCount(0);
});

test("on a phone the menu has no Dashboard link, even after visiting the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await page.goto("/");
  await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Dashboard" })).toHaveCount(0);
});

test("on a phone the demo bar folds into a small pill that opens its controls and closes again", async ({ page }) => {
  await page.goto("/");
  const dealer = page.locator("[data-demo-bar]").getByRole("link", { name: "Dealer" });
  await expect(dealer).toBeHidden();
  await demoBar(page);
  await expect(dealer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dealer).toBeHidden();
});

test("the demo bar's theme control is the footer's: one choice, shown in both", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await (await demoBar(page)).getByRole("radiogroup", { name: "Theme" }).getByText("Dark").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("contentinfo").getByRole("radio", { name: "Dark" })).toBeChecked();
});
