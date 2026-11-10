import { expect, test } from "@playwright/test";

test("viewing as Dealer changes the public page and links on to the area; Superuser and Customer switch back", async ({ page }) => {
  await page.goto("/");
  const bar = page.locator("[data-demo-bar]");
  await expect(bar.getByRole("link", { name: "Customer" })).toHaveAttribute("aria-current", "true");
  await expect(page.locator("[data-role-strip]")).toHaveCount(0);
  await bar.getByRole("link", { name: "Dealer" }).click();
  await expect(page).toHaveURL(/\/$/); // stays on the public page
  await expect(bar.getByRole("link", { name: "Dealer" })).toHaveAttribute("aria-current", "true");
  await expect(page.locator("[data-role-strip]")).toContainText("Dealer view");
  await page.locator("[data-role-strip]").getByRole("link", { name: "Open the dealer area" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await bar.getByRole("link", { name: "Superuser" }).click();
  await expect(page).toHaveURL(/\/platform$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dealerships");
  await bar.getByRole("link", { name: "Customer" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("[data-role-strip]")).toHaveCount(0);
});

test("a dealer sees stock and social controls on a car page, a customer sees none", async ({ page }) => {
  await page.goto("/used-cars");
  await page.locator("article").first().getByRole("link").first().click();
  await expect(page.getByTestId("buy-box")).toBeVisible();
  const id = new URL(page.url()).pathname.match(/-(\d+)$/)![1];
  await expect(page.locator("[data-car-controls]")).toHaveCount(0);
  await page.locator("[data-demo-bar]").getByRole("link", { name: "Dealer" }).click();
  const controls = page.locator("[data-car-controls]");
  await expect(controls.getByRole("link", { name: "Edit in stock" })).toHaveAttribute("href", `/admin/stock/${id}`);
  const post = await controls.getByRole("link", { name: "Post this car" }).getAttribute("href");
  expect(post).toMatch(/^\/admin\/marketing\?tab=social&car=.+-\d+$/);
  await page.goto(post!);
  await expect(page.getByLabel("Car").first()).not.toHaveValue(""); // the car is already chosen
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
