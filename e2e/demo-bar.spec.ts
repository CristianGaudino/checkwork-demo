import { expect, test } from "@playwright/test";

test("the demo bar switches role by route and marks the current one", async ({ page }) => {
  await page.goto("/");
  const bar = page.locator("[data-demo-bar]");
  await expect(bar.getByRole("link", { name: "Customer" })).toHaveAttribute("aria-current", "true");
  await bar.getByRole("link", { name: "Dealer" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(bar.getByRole("link", { name: "Dealer" })).toHaveAttribute("aria-current", "true");
  await bar.getByRole("link", { name: "Superuser" }).click();
  await expect(page).toHaveURL(/\/platform$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Platform");
});

test("light is the default, dark is a choice that sticks and does not flash", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).not.toHaveAttribute("data-theme", "dark");
  await expect(html).toHaveCSS("background-color", "rgb(250, 248, 245)");
  await page.getByRole("button", { name: "Light" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(html).toHaveCSS("background-color", "rgb(11, 16, 32)");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(html).not.toHaveAttribute("data-theme", "dark");
});
