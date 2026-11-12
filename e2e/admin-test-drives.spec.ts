import { expect, test } from "@playwright/test";
import { choose } from "./combo";
import { openDay } from "./days";

test("bookings are grouped by day, and a request can be confirmed", async ({ page }) => {
  await page.goto("/dashboard/test-drives?status=requested");
  const first = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: "Confirm" }) }).first();
  await expect(first).toBeVisible();
  const who = (await first.locator("[data-name]").textContent())!.trim();
  await first.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText(who)).toHaveCount(0); // it left the Requested list
  await page.goto("/dashboard/test-drives?status=confirmed");
  await expect(page.getByText(who).first()).toBeVisible();
});

test("a new booking is added, and the same car at the same time is refused", async ({ page }) => {
  await page.goto("/dashboard/test-drives");
  await page.getByText("Add a booking", { exact: true }).click();
  // A different day each run, so a retry against the same server never meets the booking of the first try.
  const day = openDay(Date.now());
  const book = async () => {
    await page.getByLabel("Name", { exact: true }).fill("Test booker");
    await page.getByLabel("Phone").fill("+353 83 000 1234");
    await choose(page.getByLabel("Car"), 2);
    await page.locator("form", { has: page.getByRole("button", { name: "Add booking" }) }).locator(`input[name="date"]`).fill(day);
    await page.locator("form", { has: page.getByRole("button", { name: "Add booking" }) }).locator(`input[name="time"]`).fill("11:00");
    await page.getByRole("button", { name: "Add booking" }).click();
  };
  await book();
  await expect(page.getByRole("status")).toContainText("Booked Test booker");
  await book();
  await expect(page.getByText(/is already booked around then/)).toBeVisible();
});

test("a day that has passed, or more than two months ahead, is refused", async ({ page }) => {
  await page.goto("/dashboard/test-drives");
  await page.getByText("Add a booking", { exact: true }).click();
  const tryDay = async (day: string) => {
    await page.getByLabel("Name", { exact: true }).fill("Test booker");
    await page.getByLabel("Phone").fill("+353 83 000 1234");
    await choose(page.getByLabel("Car"), 1);
    await page.locator("form", { has: page.getByRole("button", { name: "Add booking" }) }).locator(`input[name="date"]`).fill(day);
    await page.locator("form", { has: page.getByRole("button", { name: "Add booking" }) }).locator(`input[name="time"]`).fill("11:00");
    await page.getByRole("button", { name: "Add booking" }).click();
  };
  await tryDay("2020-01-01");
  await expect(page.getByText("Choose a day that has not passed")).toBeVisible();
  await tryDay(new Date(Date.now() + 70 * 86_400_000).toISOString().slice(0, 10)); // a typo for a later month
  await expect(page.getByText("Choose a day in the next two months")).toBeVisible();
});

test("the form says what is missing", async ({ page }) => {
  await page.goto("/dashboard/test-drives");
  await page.getByText("Add a booking", { exact: true }).click();
  await page.getByRole("button", { name: "Add booking" }).click();
  await expect(page.getByText("Enter a name")).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Choose a car" })).toBeVisible();
  await expect(page.getByText("Choose a day")).toBeVisible();
});
