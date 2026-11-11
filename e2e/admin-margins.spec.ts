import { expect, test } from "@playwright/test";

// Margins and cost prices are behind a permission that comes with the role. In this run the demo bar is on, so its role (a cookie) is
// what grants it: the owner by default, sales has none.
const as = (context: import("@playwright/test").BrowserContext, role: string) => context.addCookies([{ name: "checkwork-demo-role", value: role, url: "http://localhost:3000" }]);

test("without the permission there is no Margins screen, no margin column or stat, and no cost box", async ({ page, context }) => {
  await as(context, "Sales");
  await page.goto("/dashboard");
  await expect(page.getByRole("navigation", { name: "Dealer dashboard" }).getByRole("link", { name: "Margins" })).toHaveCount(0);
  await expect(page.getByText("Stock margin")).toHaveCount(0);
  expect((await page.request.get("/dashboard/margins")).status()).toBe(404);
  await page.goto("/dashboard/stock");
  await expect(page.getByRole("columnheader", { name: "Margin" })).toHaveCount(0);
  await page.goto("/dashboard/stock/new");
  await expect(page.getByLabel("Cost price (€)")).toHaveCount(0);
});

test("with the permission the Margins screen, the column, the stat and the cost box appear", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); // the margin columns are from 768px
  await as(context, "Finance");
  await page.goto("/dashboard");
  await expect(page.getByText("Stock margin")).toBeVisible();
  await page.getByRole("navigation", { name: "Dealer dashboard" }).getByRole("link", { name: "Margins", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Margins");
  await expect(page.getByRole("row").nth(1)).toContainText("€");
  await page.goto("/dashboard/stock");
  await expect(page.getByRole("columnheader", { name: "Margin" }).first()).toBeVisible();
  await page.goto("/dashboard/stock/new");
  await expect(page.getByLabel("Cost price (€)")).toBeVisible();
});

test("the demo bar's role decides what the dealer sees, the owner by default", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 }); // the sidebar, and the demo bar as one line
  await page.goto("/");
  const bar = page.locator("[data-demo-bar]");
  const role = bar.getByRole("combobox", { name: "Role" });
  await expect(role).toHaveCount(0); // only when viewing as the dealer
  await bar.getByRole("link", { name: "Dealer" }).click();
  await expect(role).toHaveValue("Owner");
  await page.goto("/dashboard");
  const margins = page.getByRole("navigation", { name: "Dealer dashboard" }).getByRole("link", { name: "Margins", exact: true });
  await expect(margins).toBeVisible();
  await role.selectOption("Sales");
  await expect(margins).toHaveCount(0);
  await role.selectOption("Finance");
  await expect(margins).toBeVisible();
});

test("only an owner or manager changes the team and the settings; a manager cannot change an owner", async ({ page, context }) => {
  await as(context, "Sales");
  await page.goto("/dashboard/settings");
  await expect(page.getByText("Only an owner or manager can change these settings.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
  await expect(page.getByLabel("Reply to a new lead within (hours)")).toBeDisabled();
  await as(context, "Manager");
  await page.reload();
  await expect(page.getByLabel("Reply to a new lead within (hours)")).toBeEnabled();
  await expect(page.getByLabel("Role for Conor Doyle")).toBeVisible();
  await expect(page.getByLabel("Role for Aoife Brennan")).toHaveCount(0); // the owner: a badge, not a picker
});

test("an owner changes a role as soon as it is picked, and the team cannot be left without an owner", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const name = `Role test ${Date.now()}`; // its own person, so parallel specs never see a changed team
  await page.goto("/dashboard/settings");
  const add = page.locator("form").filter({ has: page.getByLabel("Name", { exact: true }) });
  await add.getByLabel("Name", { exact: true }).fill(name);
  await add.getByLabel("Email", { exact: true }).fill(`${Date.now()}@example.com`);
  await add.getByRole("button", { name: "Save" }).click();
  const picker = page.getByLabel(`Role for ${name}`);
  await expect(picker).toHaveValue("Sales");
  await picker.click();
  await page.getByRole("listbox").getByRole("option", { name: "Finance" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(`Role for ${name}`)).toHaveValue("Finance");
  // The only owner cannot be demoted: it says why and stays an owner.
  await page.getByLabel("Role for Aoife Brennan").click();
  await page.getByRole("listbox").getByRole("option", { name: "Sales" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Keep at least one owner on the team" })).toBeVisible();
  await expect(page.getByLabel("Role for Aoife Brennan")).toHaveValue("Owner");
  await page.getByRole("row").filter({ hasText: name }).getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText(name)).toHaveCount(0);
});

test("a bad cost stops the save and says why", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await as(context, "Owner");
  await page.goto("/dashboard/stock/new");
  await page.getByLabel("Make", { exact: true }).fill("Skoda");
  await page.getByLabel("Model", { exact: true }).fill("Octavia");
  await page.getByLabel("Year", { exact: true }).fill("2021");
  await page.getByLabel("Price (€)", { exact: true }).fill("19950");
  await page.getByLabel("Cost price (€)").fill("-5");
  await page.getByRole("button", { name: "Add car" }).click();
  await expect(page.getByText("Enter the cost in whole euros")).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\/stock\/new$/); // not saved, so nothing was added to the stock
});
