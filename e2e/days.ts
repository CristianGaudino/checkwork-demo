import type { Page } from "@playwright/test";
import { driveTimes } from "../src/lib/leads/constants";

const longDay = (iso: string) => new Intl.DateTimeFormat("en-IE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

// The dashboard's slot picker shows a week at a time: move on until the day is there, then pick it.
export async function pickDay(page: Page, iso: string) {
  const day = page.getByRole("button", { name: longDay(iso), exact: true });
  for (let i = 0; i < 10 && !(await day.isVisible()); i++) await page.getByRole("button", { name: "Later days" }).click();
  await day.click();
}

// A booking taken at the desk, in its three steps: the car (its place in the list), a day and a time, then the customer.
export async function bookDrive(page: Page, o: { car: number; day: string; time: string; name: string; phone: string; email?: string }) {
  await page.goto("/dashboard/test-drives/new");
  await page.getByRole("main").locator("li > button[aria-pressed]").nth(o.car).click();
  await pickDay(page, o.day);
  await page.getByRole("button", { name: o.time, exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Name", { exact: true }).fill(o.name);
  await page.getByLabel("Phone").fill(o.phone);
  if (o.email) await page.getByLabel("Email (optional)").fill(o.email);
  await page.getByRole("button", { name: "Book test drive" }).click();
}

// A day the dealer is open, two to about eight weeks out (after the seeded bookings, inside the two months a desk booking allows), picked
// by `seed` so each run books a different day and a retry never meets the first try's booking.
export function openDay(seed: number): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
  const days = Array.from({ length: 40 }, (_, i) => new Date(Date.parse(`${today}T12:00:00Z`) + (14 + i) * 86_400_000).toISOString().slice(0, 10));
  const open = days.filter((d) => driveTimes(d).length > 0);
  return open[seed % open.length];
}
