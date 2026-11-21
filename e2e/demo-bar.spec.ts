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

test("on the narrowest phone the dealer's module switches open inside the panel and can be used", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/dashboard");
  await demoBar(page);
  const bar = page.locator("[data-demo-bar]");
  const modules = bar.getByRole("button", { name: /^Plan/ });
  await expect(modules).toBeInViewport({ ratio: 1 });
  await modules.click();
  const dealer = bar.getByRole("button", { name: /^Dealer/ });
  await expect(dealer).toBeInViewport({ ratio: 1 });
  await dealer.click();
  await expect(modules).toContainText("Dealer");
  await expect(dealer).toHaveAttribute("aria-pressed", "true");
});

test("on Showroom there is no dealer side: no View as, no dealer tools, and the Plan switch takes the demo back", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dashboard");
  const bar = await demoBar(page);
  await bar.getByRole("button", { name: /^Plan/ }).click();
  await bar.getByRole("button", { name: /^Showroom/ }).click();
  await expect(page).toHaveURL(/\/$/); // the dealer area is gone, so the demo leaves it
  await expect(bar.getByRole("navigation", { name: "View the demo as" })).toHaveCount(0);
  await expect(bar.getByRole("combobox", { name: "Role" })).toHaveCount(0);
  await expect(page.getByRole("banner").getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  await page.goto("/used-cars");
  await page.locator("article").first().getByRole("link").first().click();
  await expect(page.getByTestId("buy-box")).toBeVisible();
  await expect(page.locator("[data-car-controls]")).toHaveCount(0);
  await bar.getByRole("button", { name: /^Plan/ }).click();
  await bar.getByRole("button", { name: /^Dealer/ }).click();
  await expect(bar.getByRole("link", { name: "Dealer" })).toBeVisible(); // the dealer side is back
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
  await page.goto("/finance");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not in this plan"); // the demo says why; a client site is a plain 404
  await page.goto("/used-cars");
  await expect(page.getByRole("banner").getByRole("link", { name: "Finance" })).toHaveCount(0);
  await page.goto((await page.locator("article a").first().getAttribute("href"))!);
  await expect(page.getByRole("button", { name: "Test drive" })).toHaveCount(0);
  await expect(page.getByText(/^Estimate from €[\d,]+ a month$/).first()).toBeVisible();
});
