import { expect, test } from "@playwright/test";

// The registration lookup (#2). On the demo it is simulated: the plate's own year and county, and a sample car for the make and model.
test("the sell form fills the year from the plate and the make and model from the lookup, only where they are empty", async ({ page }) => {
  await page.goto("/sell-your-car");
  await page.getByRole("textbox", { name: /^Model/ }).fill("My own words");
  await page.getByRole("textbox", { name: /^Registration/ }).fill("191-KY-1234");
  await page.getByRole("button", { name: "Look up" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Registered in Kerry, January to June 2019" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^Year/ })).toHaveValue("2019");
  await expect(page.getByRole("textbox", { name: /^Make/ })).not.toHaveValue("");
  await expect(page.getByRole("textbox", { name: /^Model/ })).toHaveValue("My own words"); // typed, so kept
});

test("a plate that is not Irish says so and fills nothing", async ({ page }) => {
  await page.goto("/sell-your-car");
  await page.getByRole("textbox", { name: /^Registration/ }).fill("AB12 CDE");
  await page.getByRole("button", { name: "Look up" }).click();
  await expect(page.getByText("We could not read that as an Irish registration.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^Year/ })).toHaveValue("");
});

test("adding a car in the dashboard starts from the registration", async ({ page }) => {
  await page.goto("/dashboard/stock/new");
  await page.getByRole("textbox", { name: /^Registration/ }).fill("242-D-98");
  await page.getByRole("button", { name: "Look up" }).click();
  await expect(page.getByText(/Registered in Dublin, July to December 2024/)).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Year" })).toHaveValue("2024");
  await expect(page.getByRole("textbox", { name: /^Make/ })).not.toHaveValue("");
});

test("a valuation lead shows the car's plate, and the dealer can look it up", async ({ page }) => {
  await page.goto("/dashboard/leads?type=trade-in");
  await page.getByRole("row").nth(1).getByRole("link").first().click();
  const panel = page.getByRole("region", { name: "Their car" });
  await expect(panel).toContainText(/Registration \d{3}-[A-Z]{1,2}-\d+/);
  await panel.getByRole("button", { name: "Look up" }).click();
  await expect(panel.getByRole("status")).toContainText(/Registered in /);
});

test("the settings list the registration lookup as a service", async ({ page }) => {
  await page.goto("/dashboard/settings?section=services");
  await expect(page.getByRole("row", { name: /Registration lookup/ })).toContainText("Connected"); // simulated on the demo
});
