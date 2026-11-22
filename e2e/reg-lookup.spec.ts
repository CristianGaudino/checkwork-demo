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
