import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { unfold } from "./open";
import type { Page } from "@playwright/test";
import { FINANCE, pcpEstimate } from "../src/lib/finance/finance.config";
import { quote } from "../src/lib/finance/payment";
import { SOLD_VISIBLE_DAYS } from "../src/lib/stock/types";
import { choose } from "./combo";
import { stubTurnstile } from "./turnstile";

type Demo = { slug: string; make: string; model: string; variant?: string; priceEur: number; soldAt?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const live = cars.find((c) => !c.soldAt)!;
const sold = cars.find((c) => c.soldAt && Date.parse(c.soldAt) + SOLD_VISIBLE_DAYS * 86_400_000 > Date.now());
const price = (n: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

// A keystroke before React attaches does nothing.
async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
}
const calc = (page: Page) => page.locator("[data-wells]");
const result = (page: Page) => calc(page).getByRole("status");
const shown = (page: Page) => result(page).locator("> div"); // the figures, dimmed while the typed ones are not right

test("/finance estimates a monthly payment at the dealer's fixed rate as the buyer types", async ({ page }) => {
  await open(page, "/finance");
  await expect(page.getByRole("heading", { level: 1, name: "Finance" })).toBeVisible();
  await expect(page.getByText("This is an estimate only, not an approval or an offer of credit.")).toBeVisible();
  // The notice sits under both boxes at a readable width, not in the half-width payment box.
  await expect(calc(page).getByText("This is an estimate only")).toHaveCount(0);
  await expect(result(page)).toContainText(/About €[\d,]+ a month/);
  await expect(calc(page).getByLabel("APR")).toHaveCount(0); // the rate is the dealer's, never typed
  await expect(calc(page).getByText(`an example rate of ${FINANCE.defaults.aprPct}% APR`)).toBeVisible();

  await calc(page).getByLabel("Price").fill("15000");
  await calc(page).getByLabel("Deposit").fill("3000");
  await choose(calc(page).getByLabel("Term"), "48 months");
  const q = quote(15000, 3000, 48, FINANCE.defaults.aprPct)!;
  await expect(result(page)).toContainText(`About ${price(q.monthlyEur)} a month`);
  await expect(result(page)).toContainText("€12,000");
});

test("/finance switches to PCP: the monthly payment, the optional final payment, the mileage allowance and the PCP wording", async ({ page }) => {
  test.skip(!FINANCE.pcp, "This dealer offers hire purchase only");
  const pcp = FINANCE.pcp!;
  await open(page, "/finance");
  const choice = calc(page).getByRole("group", { name: "Type of finance" });
  await expect(choice.getByRole("button", { name: "Hire purchase" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Hire purchase, subject to status.")).toBeVisible();

  await calc(page).getByLabel("Price").fill("15000");
  await calc(page).getByLabel("Deposit").fill("3000");
  await choose(calc(page).getByLabel("Term"), "60 months");
  await choice.getByRole("button", { name: "PCP" }).click();
  await expect(choice.getByRole("button", { name: "PCP" })).toHaveAttribute("aria-pressed", "true");
  await expect(calc(page).getByLabel("Term")).toHaveValue(`${pcp.termMonths} months`); // 60 months is hire purchase only
  const q = pcpEstimate(15000, 3000, pcp.termMonths)!;
  await expect(result(page)).toContainText(`About ${price(q.monthlyEur)} a month`);
  const row = (label: string) => result(page).locator("dl > div", { has: page.getByText(label, { exact: true }) });
  await expect(row("Optional final payment")).toContainText(price(q.finalEur));
  await expect(row("Mileage allowance")).toContainText(`${pcp.kmPerYear.toLocaleString("en-IE")} km a year`);
  await expect(calc(page).getByText(`an example rate of ${pcp.aprPct}% APR`)).toBeVisible();
  await expect(page.getByText("Personal contract plan, subject to status.")).toBeVisible();
  await expect(page.getByText("Hire purchase, subject to status.")).toHaveCount(0);

  await calc(page).getByLabel("Deposit").fill("12000");
  await expect(page.getByText("Deposit is too high for PCP. Lower it or choose hire purchase.")).toBeVisible();
  // The last good figures stay, dimmed, while the field's error says what to fix.
  await expect(shown(page)).toHaveCSS("opacity", "0.6");
  await expect(result(page)).toContainText(`About ${price(q.monthlyEur)} a month`);
});

test("/finance is the estimator only: no car picker, no application, a button to choose a car, and the facts", async ({ page }) => {
  await open(page, "/finance");
  await expect(calc(page).getByLabel("Car")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ask about finance" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Select a car to enquire" })).toHaveAttribute("href", "/used-cars");
  // The estimate wording is said once, in the dealer's notice under the calculator.
  await expect(page.getByText("This is an estimate only, not an approval or an offer of credit.")).toHaveCount(1);
  await expect(page.getByText(/not an approval/i)).toHaveCount(1);
  await expect(page.getByText(/Send your details/)).toHaveCount(0);
});

test("/finance shows what to fix, never NaN, and dims the last good figure until the figures are right again", async ({ page }) => {
  await open(page, "/finance");
  await calc(page).getByLabel("Price").fill("15000");
  await calc(page).getByLabel("Deposit").fill("3000");
  const good = quote(15000, 3000, FINANCE.defaults.termMonths, FINANCE.defaults.aprPct)!;
  await expect(result(page)).toContainText(`About ${price(good.monthlyEur)} a month`);
  await expect(shown(page)).toHaveCSS("opacity", "1");

  await calc(page).getByLabel("Deposit").fill("15000");
  await expect(page.getByText("Deposit must be less than the price.")).toBeVisible();
  await expect(shown(page)).toHaveCSS("opacity", "0.6");
  await expect(result(page)).toContainText(`About ${price(good.monthlyEur)} a month`);
  // Only the eye gets the stale figure: a screen reader hears what to do instead.
  await expect(shown(page)).toHaveAttribute("aria-hidden", "true");
  await expect(result(page).locator("p.sr-only", { hasText: "Check the figures you entered." })).toBeAttached();

  await calc(page).getByLabel("Deposit").fill("3000");
  await calc(page).getByLabel("Price").fill("999");
  await expect(page.getByText("Enter a price between €1,000 and €250,000.")).toBeVisible();
  await expect(shown(page)).toHaveCSS("opacity", "0.6");
  expect(await page.locator("body").innerText()).not.toContain("NaN");

  await calc(page).getByLabel("Price").fill("15000");
  await expect(shown(page)).toHaveCSS("opacity", "1");
  await expect(shown(page)).not.toHaveAttribute("aria-hidden");
  await expect(result(page).locator("p.sr-only")).toHaveCount(0);
});

test("/finance typing a new price one key at a time never flips the result to an error or changes its height", async ({ page }) => {
  await open(page, "/finance");
  const box = calc(page).locator("> div").nth(1); // the result card
  const before = (await box.boundingBox())!.height;
  await box.evaluate((el) => {
    const w = window as unknown as { sawError: boolean; heights: Set<number> };
    w.sawError = false;
    w.heights = new Set();
    new MutationObserver(() => {
      if ([...el.querySelectorAll("p:not(.sr-only)")].some((p) => p.textContent?.includes("Check the figures you entered."))) w.sawError = true; // the screen reader hint is fine
      w.heights.add(Math.round(el.getBoundingClientRect().height));
    }).observe(el, { subtree: true, childList: true, characterData: true, attributes: true });
  });
  const field = calc(page).getByLabel("Price");
  await field.fill("");
  await field.pressSequentially("25000", { delay: 50 });
  const q = quote(25000, FINANCE.defaults.depositEur, FINANCE.defaults.termMonths, FINANCE.defaults.aprPct)!;
  await expect(result(page)).toContainText(`About ${price(q.monthlyEur)} a month`);
  const seen = await page.evaluate(() => {
    const w = window as unknown as { sawError: boolean; heights: Set<number> };
    return { sawError: w.sawError, heights: [...w.heights] };
  });
  expect(seen.sawError).toBe(false);
  for (const h of seen.heights) expect(h).toBe(Math.round(before));
});

test("the header links /finance from 1024px, the footer always, and the header still fits 320px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/used-cars");
  await page.getByRole("banner").getByRole("link", { name: "Finance" }).click();
  await expect(page).toHaveURL(/\/finance$/);
  await page.setViewportSize({ width: 320, height: 640 });
  await expect(page.getByRole("banner").getByRole("link", { name: "Finance" })).toBeHidden();
  await expect((await unfold(page.getByRole("contentinfo"))).getByRole("link", { name: "Finance" })).toHaveAttribute("href", "/finance");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("a sold car page has no Finance section", async ({ page }) => {
  test.skip(!sold, "No demo car is inside the sold window: run npm run stock:redate to refresh the demo dates");
  await page.goto(`/used-cars/${sold!.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Finance", exact: true })).toHaveCount(0);
  await expect(calc(page)).toHaveCount(0);
});

test.describe("finance application", () => {
  // Runs only on the local server with fake backends: it must never send a lead to a deployed site.
  test.skip(Boolean(process.env.E2E_BASE_URL), "Lead specs never run against a deployed site");
  test.beforeEach(async ({ page }) => stubTurnstile(page));

  test("Ask about finance carries the deposit and term over, needs employment, asks nothing about money or identity", async ({ page }) => {
    await open(page, `/used-cars/${live.slug}`);
    await calc(page).getByLabel("Deposit").fill("4000");
    await choose(calc(page).getByLabel("Term"), "36 months");
    await page.getByRole("button", { name: "Ask about finance" }).click();

    const d = page.getByRole("dialog", { name: "Ask about finance" });
    await expect(d).toBeVisible();
    await expect(d.getByLabel("Deposit")).toHaveValue("4000");
    await expect(d.getByLabel("Term")).toHaveValue("36 months");
    if (FINANCE.pcp) await expect(d.getByLabel("Type of finance")).toHaveValue("Hire purchase");
    await expect(d.getByText("We don't ask for income, date of birth or bank details.")).toBeVisible();
    await expect(d.getByLabel(/income|date of birth|bank/i)).toHaveCount(0);

    await d.getByLabel("Name").fill("Test buyer");
    await d.getByLabel("Phone").fill("087 123 4567");
    await d.getByRole("checkbox").check();
    await d.getByRole("button", { name: "Send details" }).click();
    await expect(d.locator("p", { hasText: "Choose an employment status." })).toBeVisible();

    await choose(d.getByLabel("Employment status"), "Self-employed");
    await d.getByRole("button", { name: "Send details" }).click();
    await expect(d.getByRole("heading", { name: "Thanks, we have your details." })).toBeFocused();
  });

  test("Ask about finance on PCP carries PCP over with the deposit and term", async ({ page }) => {
    test.skip(!FINANCE.pcp, "This dealer offers hire purchase only");
    await open(page, `/used-cars/${live.slug}`);
    await calc(page).getByRole("button", { name: "PCP" }).click();
    await calc(page).getByLabel("Deposit").fill("4000");
    await choose(calc(page).getByLabel("Term"), "24 months");
    await page.getByRole("button", { name: "Ask about finance" }).click();
    const d = page.getByRole("dialog", { name: "Ask about finance" });
    await expect(d.getByLabel("Type of finance")).toHaveValue("PCP");
    await expect(d.getByLabel("Deposit")).toHaveValue("4000");
    await expect(d.getByLabel("Term")).toHaveValue("24 months");
  });

  test("a car page works out finance on that car's price and applies for that car", async ({ page }) => {
    await open(page, `/used-cars/${live.slug}`);
    await expect(page.getByRole("heading", { name: "Finance", exact: true })).toBeVisible();
    await expect(calc(page).getByText(price(live.priceEur), { exact: true })).toBeVisible();
    await expect(calc(page).getByLabel("Price")).toHaveCount(0); // text, not an input
    await expect(result(page)).toContainText(/About €[\d,]+ a month/);

    const apply = page.getByRole("button", { name: "Ask about finance" });
    await expect(apply).not.toHaveClass(/bg-accent/); // Enquire keeps the page's one accent
    await apply.click();
    const d = page.getByRole("dialog", { name: "Ask about finance" });
    await expect(d).toBeVisible();
    await expect(d.getByText([live.make, live.model, live.variant].filter(Boolean).join(" "))).toBeVisible();
    await expect(d.getByText(price(live.priceEur))).toBeVisible();
  });
});
