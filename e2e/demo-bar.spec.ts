import { expect, test } from "@playwright/test";
import { demoBar } from "./open";

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
  await (await demoBar(page)).getByRole("link", { name: "Dealer" }).click();
  const controls = page.locator("[data-car-controls]");
  await expect(controls.getByRole("link", { name: "Edit car" })).toHaveAttribute("href", `/dashboard/stock/${id}`);
  const post = await controls.getByRole("link", { name: "Post to social" }).getAttribute("href");
  expect(post).toMatch(/^\/dashboard\/marketing\/new\?car=.+-\d+$/);
  await page.goto(post!);
  await expect(page.getByRole("heading", { name: /Step 2 of 4/ })).toBeVisible(); // the car is already chosen
});

test("on a phone the Dashboard link is in the menu when viewing as the dealer", async ({ page }) => {
  await page.goto("/");
  await (await demoBar(page)).getByRole("link", { name: "Dealer" }).click();
  await page.keyboard.press("Escape"); // fold the demo pill again
  await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
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

test("on the narrowest phone the dealer's module switches open inside the panel and can be used", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/dashboard");
  await demoBar(page);
  const bar = page.locator("[data-demo-bar]");
  const modules = bar.getByRole("button", { name: /^Plan/ });
  await expect(modules).toBeInViewport({ ratio: 1 });
  await modules.click();
  const showroom = bar.getByRole("button", { name: /^Showroom/ });
  await expect(showroom).toBeInViewport({ ratio: 1 });
  await showroom.click();
  await expect(modules).toContainText("Showroom");
  await expect(showroom).toHaveAttribute("aria-pressed", "true");
});

test("light is the default, dark is a choice that sticks and does not flash", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).not.toHaveAttribute("data-theme", "dark");
  await expect(html).toHaveCSS("background-color", "rgb(244, 246, 251)");
  await (await demoBar(page)).getByRole("button", { name: "Light" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(html).toHaveCSS("background-color", "rgb(11, 15, 31)");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await (await demoBar(page)).getByRole("button", { name: "Dark" }).click();
  await expect(html).not.toHaveAttribute("data-theme", "dark");
});

test("the public site follows the modules: with none on, the module pages are gone, from the menu and the car page too (the finance estimate stays: it is the car's price)", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "checkwork-demo-modules", value: "none", url: baseURL! }]);
  for (const path of ["/finance", "/trade-in", "/test-drive", "/reviews", "/service", "/new-cars", "/commercial", "/find-a-car"]) expect((await page.request.get(path)).status(), path).toBe(404);
  expect((await page.request.get("/dashboard/test-drives")).status()).toBe(404);
  await page.goto("/used-cars");
  await expect(page.getByRole("banner").getByRole("link", { name: "Finance" })).toHaveCount(0);
  await page.goto((await page.locator("article a").first().getAttribute("href"))!);
  await expect(page.getByRole("button", { name: "Test drive" })).toHaveCount(0);
  await expect(page.getByText(/^Estimate from €[\d,]+ a month$/).first()).toBeVisible();
});
