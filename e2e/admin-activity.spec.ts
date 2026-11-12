import { expect, test } from "@playwright/test";

// The activity history: owners and managers only (the demo bar's role, a cookie), every change, newest first.
const as = (context: import("@playwright/test").BrowserContext, role: string) => context.addCookies([{ name: "checkwork-demo-role", value: role, url: "http://localhost:3000" }]);
import { sideLink } from "./admin-menu";

test("sales and finance have no Activity page; owners and managers do", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 }); // the sidebar; the phone tab bar has its own test (admin-shell)
  for (const role of ["Sales", "Finance"]) {
    await as(context, role);
    await page.goto("/dashboard");
    await expect(await sideLink(page, "Activity")).toHaveCount(0);
    expect((await page.request.get("/dashboard/activity")).status()).toBe(404);
  }
  for (const role of ["Manager", "Owner"]) {
    await as(context, role);
    await page.goto("/dashboard");
    await (await sideLink(page, "Activity")).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Activity");
    expect(await page.getByRole("table").getByRole("row").count()).toBeGreaterThan(10); // the demo's history, not empty
  }
});

test("a change shows at the top, by the person who made it, and the filters narrow the list", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const name = `Activity test ${Date.now()}`; // its own record, so parallel specs never move it
  await page.goto("/dashboard/settings");
  const add = page.locator("form").filter({ has: page.getByLabel("Name", { exact: true }) });
  await add.getByLabel("Name", { exact: true }).fill(name);
  await add.getByLabel("Email", { exact: true }).fill(`${Date.now()}@example.com`);
  await add.getByRole("button", { name: "Save" }).click();
  await expect(page.getByLabel(`Role for ${name}`)).toBeVisible();

  await page.goto("/dashboard/activity?area=settings");
  const row = page.getByRole("row").filter({ hasText: `Added ${name} to the team as Sales` });
  await expect(row).toContainText("Aoife Brennan");
  await expect(row.getByRole("link", { name })).toHaveAttribute("href", "/dashboard/settings");
  await expect(page.getByRole("navigation", { name: "Area" }).getByRole("link", { name: /Settings/ })).toHaveAttribute("aria-current", "true");
  // Every row in the Settings view is a settings change.
  await page.getByRole("navigation", { name: "Person" }).getByRole("link", { name: "Conor Doyle" }).click();
  await expect(page.getByRole("row").filter({ hasText: name })).toHaveCount(0);
  // A bad filter is ignored, not an error.
  expect((await page.request.get("/dashboard/activity?area=nope&who=nobody&period=x&page=999")).status()).toBe(200);

  await page.goto("/dashboard/settings");
  await page.getByRole("row").filter({ hasText: name }).getByRole("button", { name: "Remove" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText(name)).toHaveCount(0);
});

test("a lead in the history is named from the lead itself, and links to it", async ({ page }) => {
  await page.goto("/dashboard/activity?area=leads");
  const link = page.getByRole("table").getByRole("link").first();
  await expect(link).toHaveAttribute("href", /^\/dashboard\/leads\/lead-/);
  await link.click();
  await expect(page).toHaveURL(/\/dashboard\/leads\/lead-/);
});

test("the Activity page holds at 320px without sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/dashboard/activity");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});
