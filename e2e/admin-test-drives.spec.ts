import { expect, test } from "@playwright/test";
import { choose } from "./combo";

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
  const day = `2031-05-${String(1 + (Date.now() % 28)).padStart(2, "0")}`;
  const book = async () => {
    await page.getByLabel("Name", { exact: true }).fill("Test booker");
    await page.getByLabel("Phone").fill("+353 83 000 1234");
    await choose(page.getByLabel("Car"), 2);
    await page.locator('input[name="date"]').fill(day);
    await page.locator('input[name="time"]').fill("11:00");
    await page.getByRole("button", { name: "Add booking" }).click();
  };
  await book();
  await expect(page.getByRole("status")).toContainText("Booked Test booker");
  await book();
  await expect(page.getByText(/is already booked around then/)).toBeVisible();
});

test("a day that has passed is refused", async ({ page }) => {
  await page.goto("/dashboard/test-drives");
  await page.getByText("Add a booking", { exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Test booker");
  await page.getByLabel("Phone").fill("+353 83 000 1234");
  await choose(page.getByLabel("Car"), 1);
  await page.locator('input[name="date"]').fill("2020-01-01");
  await page.locator('input[name="time"]').fill("11:00");
  await page.getByRole("button", { name: "Add booking" }).click();
  await expect(page.getByText("Choose a day that has not passed")).toBeVisible();
});

test("the form says what is missing", async ({ page }) => {
  await page.goto("/dashboard/test-drives");
  await page.getByText("Add a booking", { exact: true }).click();
  await page.getByRole("button", { name: "Add booking" }).click();
  await expect(page.getByText("Enter a name")).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Choose a car" })).toBeVisible();
  await expect(page.getByText("Choose a day")).toBeVisible();
});
