import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { choose } from "./combo";
import { leadSentTo } from "./dash-stub";
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
// Next, then wait for the step to change: a second tap too soon lands on the step that is still leaving.
async function next(page: Page) {
  const [, at, of] = (await page.getByText(/^Step \d+ of \d+$/).first().textContent())?.match(/(\d+) of (\d+)/) ?? [];
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText(`Step ${Number(at) + 1} of ${of}`)).toBeVisible();
}
const pick = (page: Page, label: string) => page.getByRole("main").getByText(label, { exact: true }).click();
// The first step is one question: picking a topic moves on by itself, with no Next.
async function topic(page: Page, label: string) {
  await pick(page, label);
  await expect(page.getByText("Step 2 of 3")).toBeVisible();
}

// The last step: details, consent, send.
async function finish(page: Page, name: string) {
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Phone", { exact: true }).fill("087 123 4567");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("heading", { name: "Thanks, we have your message." })).toBeFocused();
}

// Each topic: the card, its taps, and the topic and answers that reach the dealer dashboard.
const TOPICS = [
  { topic: "Buying", card: "Buying a car", taps: ["This week", "Yes"], sent: { topic: "buying", timing: "this-week", hasTradeIn: "yes" } },
  { topic: "Finance", card: "Finance", taps: [], sent: { topic: "finance" } },
  { topic: "Service", card: "Service or repair", taps: ["Warning light", "This week"], sent: { topic: "service", serviceNeed: "warning-light", urgency: "this-week" } },
  { topic: "Other", card: "Something else", taps: [], sent: { topic: "other" }, message: "Do you open on bank holidays?" },
] as const;

test.beforeEach(async ({ page }) => stubTurnstile(page));

for (const [where, viewport] of [["on a phone", undefined], ["on a computer", { width: 1280, height: 900 }]] as const) {
  test.describe(where, () => {
    if (viewport) test.use({ viewport, isMobile: false, hasTouch: false });

    for (const t of TOPICS) {
      test(`${t.card}: taps, details, thanks, and the dashboard gets the topic and answers`, async ({ page }) => {
        const name = who(t.topic);
        await open(page);
        await topic(page, t.card);
        if ("message" in t) await page.getByLabel("How can we help?").fill(t.message);
        for (const tap of t.taps) await pick(page, tap);
        await next(page);
        await finish(page, name);

        expect((await leadSentTo(name)).lead.details).toMatchObject(t.sent);
      });
    }

    test("a car you bought: the dashboard gets it as a car you bought", async ({ page }) => {
      const name = who("Bought");
      await open(page);
      await topic(page, "A car I bought from you");
      await page.getByLabel("Registration").fill("191-KY-1234");
      for (const tap of ["In the last month", "A fault", "Can't be driven"]) await pick(page, tap);
      await next(page);
      await finish(page, name);
      expect((await leadSentTo(name)).lead.details).toMatchObject({ topic: "bought", reg: "191-KY-1234", boughtWhen: "month", concern: "fault", urgency: "cant-drive" });
    });
  });
}

test("two taps and a message: Something else, then the words", async ({ page }) => {
  await open(page);
  await topic(page, "Something else");
  await expect(page.getByLabel("How can we help?")).toBeVisible();
});

test("on a phone the topic step and a topic's questions fit the screen, buttons included", async ({ page }) => {
  await open(page);
  // The whole form, buttons included, is no taller than the screen.
  const inView = async () => expect(await page.locator("main form").evaluate((f) => f.getBoundingClientRect().height)).toBeLessThanOrEqual(page.viewportSize()!.height);
  await inView();
  await topic(page, "Service or repair");
  await expect(page.getByLabel("Registration")).toBeVisible();
  await inView();
});

test("selling hands over to the valuation forms", async ({ page }) => {
  await open(page);
  await topic(page, "Selling or trading in my car");
  await expect(page.getByRole("link", { name: "Sell my car" })).toHaveAttribute("href", "/sell-your-car");
  await page.getByRole("link", { name: "Trade it in" }).click();
  await expect(page).toHaveURL(/\/trade-in$/);
});

test("a car to trade in: the trade-in form opens with the car chosen", async ({ page }) => {
  await open(page);
  await topic(page, "Buying a car");
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
  await topic(page, "Something else");
  await page.getByLabel("How can we help?").fill("Is the blue Golf still there?");
  await next(page);
  await finish(page, name);
});

test("a visit from a tagged Facebook post: the dashboard is told it came from Facebook", async ({ page }) => {
  const name = who("Channel");
  await page.goto("/?utm_source=facebook&utm_medium=social");
  await page.waitForFunction(() => sessionStorage.getItem("visit-channel") === "facebook");
  await open(page); // a later page of the same visit keeps the channel
  await topic(page, "Something else");
  await page.getByLabel("How can we help?").fill("Is the blue Golf still there?");
  await next(page);
  await finish(page, name);
  expect((await leadSentTo(name)).lead.details).toMatchObject({ channel: "Facebook" });
});

test("every need has its card, and the WhatsApp opt-in is offered: the site has no plans", async ({ page }) => {
  await open(page);
  for (const card of ["Buying a car", "Selling or trading in my car", "Finance", "Service or repair", "A car I bought from you", "Something else"]) await expect(page.getByRole("main").getByText(card, { exact: true })).toBeVisible();
  await topic(page, "Buying a car");
  await next(page);
  await expect(page.getByRole("switch", { name: "Send me updates on WhatsApp" })).toBeVisible();
});

test("picking a topic moves on by itself: keys too, and Back keeps the choice", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("button", { name: "Next", exact: true })).toHaveCount(0); // nothing to press after a pick
  // Arrow keys only move through the topics; Space picks one and moves on, with focus on the new step's heading.
  await page.getByRole("radio", { name: "Buying a car" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: "Selling or trading in my car" })).toBeChecked();
  await expect(page.getByText("Step 1 of 3")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await expect(page.getByRole("heading", { name: /Step 2 of 3/ })).toBeFocused();
  await expect(page.getByRole("link", { name: "Work out a payment" })).toBeVisible(); // Finance
  // Back keeps the choice; picking it again moves on, and so does picking another, with Enter.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Finance" })).toBeChecked();
  await pick(page, "Finance");
  await expect(page.getByText("Step 2 of 3")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("radio", { name: "Something else" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /Step 2 of 3/ })).toBeFocused();
  await expect(page.getByLabel("How can we help?")).toBeVisible();
});
