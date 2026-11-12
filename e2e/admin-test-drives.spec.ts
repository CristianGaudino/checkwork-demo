import { expect, test } from "@playwright/test";
import { openDay, pickDay } from "./days";

test("a request is confirmed from the list, and Undo puts it back", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dashboard/test-drives");
  await expect(page.getByRole("link", { name: "Today", exact: true })).toHaveAttribute("aria-current", "page");
  const waiting = page.getByRole("region", { name: /^Waiting to be confirmed/ });
  const first = waiting.getByRole("listitem").first();
  const who = (await first.locator("[data-name]").textContent())!.trim();
  await first.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText(`${who}: Confirmed`)).toBeVisible();
  await expect(waiting.getByText(who, { exact: true })).toHaveCount(0);
  await page.getByTestId("toast").getByRole("button", { name: "Undo" }).click();
  await expect(waiting.getByText(who, { exact: true })).toBeVisible();
});

test("the list filters, Only mine keeps the bookings given to me, and a booking opens on its own page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dashboard/test-drives?view=list");
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("radio", { name: "Completed" }).check();
  await expect(page).toHaveURL(/status=completed/);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const rows = page.getByRole("table").getByRole("row");
  await expect(rows.nth(1)).toContainText("Completed");
  await page.getByRole("link", { name: "Only mine" }).click();
  await expect(page).toHaveURL(/mine=1/);
  const me = "Aoife Brennan"; // the demo's owner, the role the tests run as
  for (const row of await rows.all().then((r) => r.slice(1))) await expect(row).toContainText(me);
  await rows.nth(1).getByRole("link").first().click();
  await expect(page).toHaveURL(/\/dashboard\/test-drives\/drive-/);
  await expect(page.getByRole("region", { name: "Taking them out" }).getByRole("button", { name: me })).toHaveAttribute("aria-pressed", "true");
});

test("the week shows seven days, and a phone gets a strip of days", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dashboard/test-drives?view=week");
  await expect(page.getByRole("heading", { level: 2, name: / to / })).toBeVisible();
  await expect(page.locator("section[aria-label]").filter({ has: page.getByRole("heading", { level: 3 }) })).toHaveCount(7);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("navigation", { name: "Day" }).getByRole("link")).toHaveCount(7);
});

test("a booking is made in steps, and the same car's time is then taken", async ({ page }) => {
  // A different day each run, so a retry against the same server never meets the booking of the first try.
  const day = openDay(Date.now());
  const book = async () => {
    await page.goto("/dashboard/test-drives/new");
    await page.getByRole("list").getByRole("button").nth(1).click(); // the second car
    await expect(page.getByRole("heading", { name: /Step 2 of 3/ })).toBeFocused();
    await pickDay(page, day);
  };
  await book();
  await page.getByRole("button", { name: "11:00" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Book test drive" }).click();
  await expect(page.getByText("Enter a name")).toBeVisible(); // what is missing, on the step it belongs to
  await page.getByRole("textbox", { name: /^Name/ }).fill("Test booker"); // its name now carries the error too
  await page.getByLabel("Phone").fill("+353 83 000 1234");
  await page.getByRole("button", { name: "Book test drive" }).click();
  await expect(page.getByText("Booked Test booker for")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`view=week&day=${day}`));
  await book();
  await expect(page.getByRole("button", { name: "11:00" })).toBeDisabled(); // that car is out then
  await expect(page.getByRole("button", { name: "12:00" })).toBeEnabled();
});
