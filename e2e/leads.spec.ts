import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { SOLD_VISIBLE_DAYS } from "../src/lib/stock/types";
import { choose, optionLabels } from "./combo";
import { DASH_STUB_URL, dashBodies, leadSentTo } from "./dash-stub";
import { stubTurnstile } from "./turnstile";

// Runs only on the local server with fake backends: it must never send a lead to a deployed site.
test.skip(Boolean(process.env.E2E_BASE_URL), "Lead specs never run against a deployed site");

type Demo = { id: string; slug: string; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const live = cars.find((c) => !c.soldAt)!;
const sold = cars.find((c) => c.soldAt && Date.parse(c.soldAt) + SOLD_VISIBLE_DAYS * 86_400_000 > Date.now());

// A tap before React attaches does nothing.
async function open(page: Page, slug: string) {
  await page.goto(`/used-cars/${slug}`);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
}
const dialog = (page: Page) => page.getByRole("dialog", { name: "Enquire" });
const enquire = (page: Page) => page.getByRole("button", { name: "Enquire", exact: true });

test.beforeEach(async ({ page }) => stubTurnstile(page));

test("an enquiry from a car page ends on the thanks, and the next one starts empty", async ({ page }) => {
  await open(page, live.slug);
  await enquire(page).click();
  const d = dialog(page);
  await expect(d).toBeVisible();
  await expect(d.getByRole("button", { name: "Close" })).toBeFocused();

  await d.getByLabel("Name").fill("Test buyer");
  await d.getByLabel("Email", { exact: true }).fill("buyer@example.com");
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Send enquiry" }).click();

  const thanks = d.getByRole("heading", { name: "Thanks, we have your enquiry." });
  await expect(thanks).toBeVisible();
  await expect(thanks).toBeFocused();

  await d.getByRole("button", { name: "Close" }).last().click();
  await expect(d).toBeHidden();
  await expect(enquire(page)).toBeFocused();
  await enquire(page).click();
  await expect(d.getByLabel("Name")).toHaveValue("");
  await expect(d.getByLabel("Email", { exact: true })).toHaveValue("");
  await expect(d.getByRole("checkbox")).not.toBeChecked();
});

test("closing the dialog keeps what was typed", async ({ page }) => {
  await open(page, live.slug);
  await enquire(page).click();
  await dialog(page).getByLabel("Name").fill("Half typed");
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await enquire(page).click();
  await expect(dialog(page).getByLabel("Name")).toHaveValue("Half typed");
});

test("the dialog does not scroll itself: only the form body does", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await open(page, live.slug);
  await enquire(page).click();
  await expect(dialog(page)).toBeVisible();
  const [scrollHeight, clientHeight] = await dialog(page).evaluate((d) => [d.scrollHeight, d.clientHeight]);
  expect(scrollHeight).toBeLessThanOrEqual(clientHeight);
});

test("a sold car has no lead buttons", async ({ page }) => {
  test.skip(!sold, "No demo car is inside the sold window: run npm run stock:redate to refresh the demo dates");
  await page.goto(`/used-cars/${sold!.slug}`);
  await expect(page.getByTestId("buy-box")).toBeVisible();
  for (const name of ["Enquire", "Test drive"]) await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Call us/ })).toHaveCount(0);
});

test("the bot check loads only once the dialog opens, and a failed check keeps what was typed", async ({ page }) => {
  await page.unrouteAll();
  await stubTurnstile(page, { pass: false });
  const calls: string[] = [];
  page.on("request", (r) => r.url().startsWith("https://challenges.cloudflare.com/") && calls.push(r.url()));
  await open(page, live.slug);
  expect(calls).toEqual([]);

  await enquire(page).click();
  const d = dialog(page);
  await expect.poll(() => calls.length).toBe(1);
  await d.getByLabel("Name").fill("Kept name");
  await d.getByLabel("Email", { exact: true }).fill("buyer@example.com");
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Send enquiry" }).click();
  await expect(d.getByRole("alert")).toContainText("We couldn't check this request.");
  await expect(d.getByLabel("Name")).toHaveValue("Kept name");
  await expect(d.getByRole("button", { name: "Send enquiry" })).toBeEnabled();
});

test("an empty send focuses the first field and marks each one, with no summary bar", async ({ page }) => {
  await open(page, live.slug);
  await enquire(page).click();
  const d = dialog(page);
  await d.getByRole("button", { name: "Send enquiry" }).click();

  await expect(d.getByRole("alert")).toHaveCount(0); // the errors sit by their fields; nothing above them pushes the form down
  await expect(d.locator("p", { hasText: "Enter your name." }).locator("svg")).toHaveCount(1); // each error leads with the alert icon
  await expect(d.getByLabel("Name")).toBeFocused();
  for (const label of ["Name", "Phone", "Email"]) await expect(d.getByLabel(label)).toHaveAttribute("aria-invalid", "true");
  await expect(d.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
  // The contact error shows once, under Email.
  await expect(d.locator("p", { hasText: "Add a phone number or an email." })).toHaveCount(1);
});

test("a field error keeps what was typed, and consent is needed to send", async ({ page }) => {
  await open(page, live.slug);
  await enquire(page).click();
  const d = dialog(page);
  await d.getByLabel("Name").fill("Kept name");
  await d.getByLabel("Email", { exact: true }).fill("buyer@example.com");
  await d.getByRole("button", { name: "Send enquiry" }).click();

  await expect(d.locator("p", { hasText: "Tick the box to send your request." })).toBeVisible();
  await expect(d.locator("p", { hasText: "Enter your name." })).toHaveCount(0);
  await expect(d.getByLabel("Email", { exact: true })).toHaveValue("buyer@example.com");
  await expect(d.getByLabel("Name")).toHaveValue("Kept name");
  await expect(d.getByRole("button", { name: "Send enquiry" })).toBeEnabled();

  const privacy = d.getByRole("link", { name: /Privacy policy/ });
  await expect(privacy).toHaveAttribute("href", "/privacy");
  await expect(privacy).toHaveAttribute("target", "_blank");
});

test("the Test Drive page lists the cars, books the one chosen, and the dealer sees it", async ({ page }) => {
  await page.goto("/test-drive");
  await expect(page.getByRole("heading", { level: 1, name: "Book a test drive" })).toBeVisible();
  await page.goto("/test-drive?q=Niro");
  await expect(page.getByRole("listitem").filter({ hasText: "Niro" })).toHaveCount(1); // new cars are bookable too
  await page.goto("/test-drive?q=Vito");
  await expect(page.getByRole("listitem").filter({ hasText: "Vito" }).first()).toContainText("Ex. VAT, reclaimable"); // and vans, priced as on their stock card
  await page.goto("/test-drive");
  const row = page.getByRole("listitem").filter({ hasText: "€" }).first();
  await row.getByRole("button", { name: "Book" }).click();
  const d = page.getByRole("dialog", { name: "Test drive" });
  await d.getByLabel("Name").fill("Page booker");
  await d.getByLabel("Phone").fill("087 123 4567");
  await d.getByRole("checkbox").check();
  await choose(d.getByLabel("Day"), 0);
  await choose(d.getByLabel("Time"), 0);
  await d.getByRole("button", { name: "Book" }).click();
  await expect(d.getByRole("heading", { name: "Thanks, we have your request." })).toBeFocused();
  const sent = await leadSentTo("Page booker");
  expect(sent.lead.type).toBe("test_drive");
  expect(sent.lead.details).toHaveProperty("driveDate");
});

test("Test drive asks for a day and a time, reaches the dealer dashboard as a booking, and there is no Reserve", async ({ page }) => {
  await open(page, live.slug);
  await expect(page.getByRole("button", { name: /Reserve/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Test drive", exact: true }).click();
  const d = page.getByRole("dialog");
  await expect(d).toHaveAccessibleName("Test drive");
  await d.getByLabel("Name").fill("Drive booker");
  await d.getByLabel("Phone").fill("087 123 4567");
  await d.getByRole("checkbox").check();
  // The form opens on the first day with a free time, and that time, so Book sends it as it stands.
  await expect(d.getByLabel("Day")).toHaveValue(/^\w{3}, \d+ \w{3}$/);
  await expect(d.getByLabel("Time")).toHaveValue(/^\d{2}:\d{2}$/);
  await expect(d.getByText("No match")).toHaveCount(0);
  await d.getByRole("button", { name: "Book" }).click();
  await expect(d.getByRole("heading", { name: "Thanks, we have your request." })).toBeFocused();
  const sent = await leadSentTo("Drive booker");
  expect(sent.lead).toMatchObject({ type: "test_drive", carSlug: live.slug });
  expect(sent.lead.details).toHaveProperty("driveTime");
});

test("a slot booked behind the buyer's back is refused, the picker moves off it, and the next send goes through", async ({ page }) => {
  const car = cars.filter((c) => !c.soldAt)[3];
  await open(page, car.slug);
  await page.getByRole("button", { name: "Test drive", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Name").fill("Slot loser");
  await d.getByLabel("Phone").fill("087 123 4567");
  await d.getByRole("checkbox").check();
  await d.getByLabel("Day").click(); // the first touch asks the dashboard: nothing is taken yet
  await page.keyboard.press("Escape");
  await expect(d.getByLabel("Time")).toHaveValue(/^\d{2}:\d{2}$/);
  const offered = await d.getByLabel("Time").inputValue();
  // Another buyer takes that time on every day, after the form has asked.
  const post = (times: string[]) => fetch(`${DASH_STUB_URL}/set-taken`, { method: "POST", body: JSON.stringify({ carId: car.id, times }) });
  await post(Array.from({ length: 70 }, (_, i) => `${new Date(Date.now() + (i + 1) * 864e5).toISOString().slice(0, 10)} ${offered}`));
  try {
    await d.getByRole("button", { name: "Book" }).click();
    // The refusal makes the form ask again, so the picker moves off the taken time (and the message goes with its cause). The E2E Turnstile
    // stub accepts any token, so a spent token is not reproducible here: this proves the second send is made and goes through.
    await expect(d.getByLabel("Time")).not.toHaveValue(offered);
    await d.getByRole("button", { name: "Book" }).click();
    await expect(d.getByRole("heading", { name: "Thanks, we have your request." })).toBeFocused();
    expect((await leadSentTo("Slot loser")).lead).toMatchObject({ type: "test_drive", carSlug: car.slug });
  } finally {
    await post([]);
  }
});

test("a time the dashboard says is taken for this car is not offered, and is for another car", async ({ page }) => {
  const [, other, full] = cars.filter((c) => !c.soldAt);
  let firstDay = "";
  for (const [slug, offered] of [[live.slug, false], [other.slug, true]] as const) {
    await open(page, slug);
    await page.getByRole("button", { name: "Test drive", exact: true }).click();
    const time = page.getByRole("dialog").getByLabel("Time");
    await page.getByRole("dialog").getByLabel("Day").click(); // the first touch asks the dashboard
    await page.keyboard.press("Escape");
    // The answer is a moment behind the first touch, so wait for the list to settle on what is expected.
    await expect.poll(async () => (await optionLabels(time)).includes("10:00")).toBe(offered);
    if (offered) firstDay = await page.getByRole("dialog").getByLabel("Day").inputValue(); // no slot taken for this car: the first day offered
    await page.keyboard.press("Escape");
  }
  // Every slot of the first open day is taken for this car: the form opens on it, then moves to a day with free times.
  await open(page, full.slug);
  await page.getByRole("button", { name: "Test drive", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Day").click();
  await page.keyboard.press("Escape");
  await expect(d.getByLabel("Day")).not.toHaveValue(firstDay);
  await expect(d.getByLabel("Time")).not.toHaveValue("");
});

test("a price drop alert takes an email and says what happens next", async ({ page }) => {
  await open(page, live.slug);
  await page.getByRole("button", { name: "Price alert" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Email", { exact: true }).fill("alert.person@example.com");
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Set alert" }).click();
  await expect(d.getByRole("heading", { name: "You're on the list." })).toBeFocused();
  const sent = (await dashBodies()).find((b) => b.lead.email === "alert.person@example.com");
  expect(sent?.lead.type).toBe("alert");
});

test("a sold car offers an alert for when one comes back", async ({ page }) => {
  test.skip(!sold, "No demo car is inside the sold window: run npm run stock:redate");
  await open(page, sold!.slug);
  await expect(page.getByRole("button", { name: "Notify me" })).toBeVisible();
});

test("Enquire keeps a message typed in it when the dialog is closed and opened again", async ({ page }) => {
  await open(page, live.slug);
  await enquire(page).click();
  await expect(dialog(page)).toHaveAccessibleName("Enquire");
  await expect(dialog(page).getByLabel("Message")).toHaveValue("");
  await dialog(page).getByLabel("Message").fill("Is it taxed?");
  await page.keyboard.press("Escape");
  await enquire(page).click();
  await expect(dialog(page).getByLabel("Message")).toHaveValue("Is it taxed?");
});

test("the enquiry dialog always shows the phone number with +353, as a link that dials", async ({ page }) => {
  await open(page, live.slug);
  await enquire(page).click();
  const d = page.getByRole("dialog", { name: "Enquire" });
  await expect(d.getByText(/Or call us on/)).toBeVisible();
  await expect(d.getByRole("link", { name: "+353 1 906 0045" })).toHaveAttribute("href", "tel:+35319060045");
});

test.describe("on a desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

  test("the dialog is a centred 520px panel", async ({ page }) => {
    await open(page, live.slug);
    await enquire(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toHaveCSS("opacity", "1"); // after the fade
    const box = (await dialog(page).boundingBox())!;
    expect(box.width).toBe(520);
    expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThanOrEqual(1);
  });
});

test("the open dialog never scrolls sideways at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page, live.slug);
  await enquire(page).click();
  await expect(dialog(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("the footer links the privacy page, which states the retention period", async ({ page }) => {
  await page.goto("/used-cars");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy policy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
  await expect(page.getByText("We keep each request for 12 months")).toBeVisible();
  // Deleting your details is asked for in writing, not by phone: by email once the dealer's address is confirmed, until then the contact page.
  const write = page.getByRole("main").getByRole("link", { name: /@|contact page/ });
  await expect(write).toHaveCount(2); // who we are, and your rights
  for (const l of await write.all()) await expect(l).toHaveAttribute("href", /^mailto:|^\/contact$/);
  await expect(page.getByRole("main").getByRole("link", { name: "+353 1 906 0045" })).toHaveCount(0);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("a car page still offers Call Us", async ({ page }) => {
    await page.goto(`/used-cars/${live.slug}`);
    await expect(page.getByRole("link", { name: /^Call us/ })).toHaveAttribute("href", /^tel:/);
  });
});
