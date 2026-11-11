import { expect, test } from "@playwright/test";

test("viewing as Dealer adds a Dashboard link to the public header and stays on the page; there is no Superuser", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); // the header links are from 1024px; the phone menu has its own check below
  await page.goto("/");
  const bar = page.locator("[data-demo-bar]");
  await expect(bar.getByRole("link", { name: "Customer" })).toHaveAttribute("aria-current", "true");
  await expect(bar.getByRole("link", { name: "Superuser" })).toHaveCount(0);
  await expect(page.getByRole("banner").getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  await bar.getByRole("link", { name: "Dealer" }).click();
  await expect(page).toHaveURL(/\/$/); // stays on the public page
  await expect(bar.getByRole("link", { name: "Dealer" })).toHaveAttribute("aria-current", "true");
  await expect(page.locator("[data-role-strip]")).toHaveCount(0); // a link, not a banner
  await page.getByRole("banner").getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await bar.getByRole("link", { name: "Customer" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("banner").getByRole("link", { name: "Dashboard" })).toHaveCount(0);
});

test("a dealer sees stock and social controls on a car page, a customer sees none", async ({ page }) => {
  await page.goto("/used-cars");
  await page.locator("article").first().getByRole("link").first().click();
  await expect(page.getByTestId("buy-box")).toBeVisible();
  const id = new URL(page.url()).pathname.match(/-(\d+)$/)![1];
  await expect(page.locator("[data-car-controls]")).toHaveCount(0);
  await page.locator("[data-demo-bar]").getByRole("link", { name: "Dealer" }).click();
  const controls = page.locator("[data-car-controls]");
  await expect(controls.getByRole("link", { name: "Edit car" })).toHaveAttribute("href", `/dashboard/stock/${id}`);
  const post = await controls.getByRole("link", { name: "Post to social" }).getAttribute("href");
  expect(post).toMatch(/^\/dashboard\/marketing\?car=.+-\d+$/);
  await page.goto(post!);
  await expect(page.getByLabel("Car").first()).not.toHaveValue(""); // the car is already chosen
});

test("on a phone the Dashboard link is in the menu when viewing as the dealer", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-demo-bar]").getByRole("link", { name: "Dealer" }).click();
  await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
});

test("light is the default, dark is a choice that sticks and does not flash", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).not.toHaveAttribute("data-theme", "dark");
  await expect(html).toHaveCSS("background-color", "rgb(244, 246, 251)");
  await page.getByRole("button", { name: "Light" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(html).toHaveCSS("background-color", "rgb(11, 15, 31)");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(html).not.toHaveAttribute("data-theme", "dark");
});
