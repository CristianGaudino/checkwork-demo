import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { MODULE_IDS, MODULES_COOKIE } from "../src/lib/modules-rules";
import { choose } from "./combo";
import { stubTurnstile } from "./turnstile";

// The guided contact form (#176): a topic, a few taps, the details. Runs only against the local server with fake backends.
test.skip(Boolean(process.env.E2E_BASE_URL), "Lead specs never run against a deployed site");

const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; // two workers can load in the same millisecond
let n = 0;
const who = (topic: string) => `Guided ${topic} ${stamp}${n++}`; // unique, so parallel runs and reruns never meet

async function open(page: Page, path = "/contact") {
  await page.goto(path);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
}
const next = (page: Page) => page.getByRole("button", { name: "Next", exact: true }).click();
const pick = (page: Page, label: string) => page.getByRole("main").getByText(label, { exact: true }).click();

// The last step: details, consent, send.
async function finish(page: Page, name: string) {
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Phone", { exact: true }).fill("087 123 4567");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("heading", { name: "Thanks, we have your message." })).toBeFocused();
}

// Each topic: the card, its taps, and the tags the dealer sees on the lead.
const TOPICS = [
  { topic: "Buying", card: "Buying a car", taps: ["This week", "Yes"], tags: "Buying · this week · trade-in" },
  { topic: "Finance", card: "Finance", taps: [], tags: "Finance" },
  { topic: "Service", card: "Service or repair", taps: ["Warning light", "This week"], tags: "Service · warning light · this week" },
  { topic: "Other", card: "Something else", taps: [], tags: "Message", message: "Do you open on bank holidays?" },
] as const;

test.beforeEach(async ({ page }) => stubTurnstile(page));

for (const [where, viewport] of [["on a phone", undefined], ["on a computer", { width: 1280, height: 900 }]] as const) {
  test.describe(where, () => {
    if (viewport) test.use({ viewport, isMobile: false, hasTouch: false });

    for (const t of TOPICS) {
      test(`${t.card}: taps, details, thanks, and the dealer sees the tags`, async ({ page }) => {
        const name = who(t.topic);
        await open(page);
        await pick(page, t.card);
        await next(page);
        // Wait for the step to change before the next tap: a second tap too soon lands on the step that is still leaving.
        await expect(page.getByText("Step 2 of 3")).toBeVisible();
        if ("message" in t) await page.getByLabel("How can we help?").fill(t.message);
        for (const tap of t.taps) await pick(page, tap);
        await next(page);
        await finish(page, name);

        await page.goto(`/dashboard/leads?q=${encodeURIComponent(name)}`);
        const row = page.getByRole("row").filter({ hasText: name });
        await expect(row).toContainText(t.tags);
      });
    }

    test("a car you bought: the claim goes to Aftersales, not to Leads", async ({ page }) => {
      const name = who("Bought");
      await open(page);
      await pick(page, "A car I bought from you");
      await next(page);
      await page.getByLabel("Registration").fill("191-KY-1234");
      for (const tap of ["In the last month", "A fault", "Can't be driven"]) await pick(page, tap);
      await next(page);
      await finish(page, name);
      await page.goto("/dashboard/aftersales");
      await expect(page.getByRole("table")).toContainText(name);
    });
  });
}

test("two taps and a message: Something else, then the words", async ({ page }) => {
  await open(page);
  await pick(page, "Something else");
  await next(page);
  await expect(page.getByLabel("How can we help?")).toBeVisible();
});

test("on a phone the topic step and a topic's questions fit the screen, buttons included", async ({ page }) => {
  await open(page);
  // The whole form, buttons included, is no taller than the screen.
  const inView = async () => expect(await page.locator("main form").evaluate((f) => f.getBoundingClientRect().height)).toBeLessThanOrEqual(page.viewportSize()!.height);
  await inView();
  await pick(page, "Service or repair");
  await next(page);
  await expect(page.getByLabel("Registration")).toBeVisible();
  await inView();
});

test("selling hands over to the valuation forms", async ({ page }) => {
  await open(page);
  await pick(page, "Selling or trading in my car");
  await next(page);
  await expect(page.getByRole("link", { name: "Sell my car" })).toHaveAttribute("href", "/sell-your-car");
  await page.getByRole("link", { name: "Trade it in" }).click();
  await expect(page).toHaveURL(/\/trade-in$/);
});

test("a car to trade in: the trade-in form opens with the car chosen", async ({ page }) => {
  await open(page);
  await pick(page, "Buying a car");
  await next(page);
  await choose(page.getByRole("combobox", { name: /Which car/ }), 1); // 0 is "Not sure yet"
  const car = (await page.getByRole("combobox", { name: /Which car/ }).inputValue()).trim();
  expect(car).not.toBe("");
  await pick(page, "Yes");
  await page.getByRole("link", { name: "Value my car now" }).click();
  await expect(page).toHaveURL(/\/trade-in$/);
  await expect(page.getByRole("combobox", { name: /The car you want/ })).toHaveValue(car);
});

test("a message sent by only typing is still valid, so the old free-text path stands", async ({ page }) => {
  const name = who("Typed");
  await open(page);
  await pick(page, "Something else");
  await next(page);
  await page.getByLabel("How can we help?").fill("Is the blue Golf still there?");
  await next(page);
  await finish(page, name);
});

test.describe("modules", () => {
  const without = (...off: string[]) => MODULE_IDS.filter((m) => !off.includes(m)).join(",");

  test("no Service card without the service module, and no Selling or Finance cards without theirs", async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: MODULES_COOKIE, value: without("service", "tradeIn", "finance"), url: baseURL! }]);
    await open(page);
    await expect(page.getByText("Buying a car", { exact: true })).toBeVisible();
    for (const card of ["Service or repair", "Selling or trading in my car", "Finance"]) await expect(page.getByText(card, { exact: true })).toHaveCount(0);
    await expect(page.getByText("Something else", { exact: true })).toBeVisible();
  });

  test("the WhatsApp opt-in shows only with the WhatsApp module", async ({ page, baseURL }) => {
    await open(page);
    await pick(page, "Buying a car");
    await next(page);
    await next(page);
    await expect(page.getByRole("switch", { name: "Send me updates on WhatsApp" })).toBeVisible();
    await page.context().addCookies([{ name: MODULES_COOKIE, value: without("whatsapp"), url: baseURL! }]);
    await open(page);
    await expect(page.getByRole("switch", { name: "Send me updates on WhatsApp" })).toHaveCount(0);
  });
});

test("an urgent lead is listed before the others, and the list filters by topic", async ({ page }) => {
  const name = who("Urgent");
  await open(page);
  await pick(page, "Service or repair");
  await next(page);
  await pick(page, "A noise");
  await pick(page, "This week");
  await next(page);
  await finish(page, name);

  await page.goto("/dashboard/leads?status=new");
  const rows = await page.getByRole("row").allTextContents();
  const at = rows.findIndex((r) => r.includes(name));
  expect(at).toBeGreaterThan(0);
  for (const r of rows.slice(1, at + 1)) expect(r).toMatch(/this week|can't be driven/); // only urgent ones come before it

  await page.goto("/dashboard/leads?topic=service");
  const filtered = await page.getByRole("row").allTextContents();
  expect(filtered.length).toBeGreaterThan(1);
  for (const r of filtered.slice(1)) expect(r).toContain("Service ·");
});
