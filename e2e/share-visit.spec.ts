import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { startDashStub } from "./dash-stub";
import type { DashBody } from "./dash-stub";
import { stubTurnstile } from "./turnstile";

// #249: a visit's note goes with an enquiry only when the buyer switches it on. Local server with fake backends only: it sends leads.
test.skip(Boolean(process.env.E2E_BASE_URL), "Lead specs never run against a deployed site");

type Demo = { id: string; slug: string; soldAt?: string };
const live = (JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8")) as Demo[]).filter((c) => !c.soldAt);
const [first, second] = live;

let stub: Awaited<ReturnType<typeof startDashStub>>;
test.beforeAll(async () => (stub = await startDashStub()));
test.afterAll(() => new Promise<void>((done) => stub.server.close(() => done())));
test.beforeEach(async ({ page }) => stubTurnstile(page));

// A tap before React attaches does nothing.
async function go(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
}
const dialog = (page: Page) => page.getByRole("dialog", { name: "Enquire" });
const share = (page: Page) => dialog(page).getByRole("switch", { name: /^Share the cars you looked at with/ });
const lines = (page: Page) => dialog(page).getByRole("listitem");

async function browse(page: Page) {
  await go(page, "/used-cars?fuel=diesel");
  await go(page, `/used-cars/${first.slug}`);
  await go(page, `/used-cars/${second.slug}`);
  await page.getByRole("button", { name: "Enquire", exact: true }).click();
  await expect(dialog(page)).toBeVisible();
}
async function send(page: Page, name: string): Promise<DashBody> {
  const d = dialog(page);
  await d.getByLabel("Name").fill(name);
  await d.getByLabel("Email", { exact: true }).fill("buyer@example.com");
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Send enquiry" }).click();
  await expect(d.getByRole("heading", { name: "Thanks, we have your enquiry." })).toBeVisible();
  await expect.poll(() => stub.bodies.find((b) => b.lead.name === name)).toBeTruthy();
  return stub.bodies.find((b) => b.lead.name === name)!;
}

test("the enquiry offers to share the cars and the search, off by default, and says what would go", async ({ page }) => {
  await browse(page);
  await expect(share(page)).not.toBeChecked();
  await expect(lines(page).first()).toBeHidden();
  // The disclosure opens from the keyboard.
  await dialog(page).getByText("What's shared").focus();
  await page.keyboard.press("Enter");
  await expect(lines(page)).toHaveText(["2 cars you looked at", "1 search", "how long you've been on the site"]);
  const target = await share(page).locator("xpath=ancestor::label").boundingBox();
  expect(target!.height).toBeGreaterThanOrEqual(44);
});

test("with the switch off, the dashboard gets no journey", async ({ page }) => {
  await browse(page);
  const body = await send(page, "Share Visit Off");
  expect(body).not.toHaveProperty("journey");
});

test("with it on, the dashboard gets the journey: the two cars and the search, in fixed values", async ({ page }) => {
  await browse(page);
  await share(page).check();
  const body = await send(page, "Share Visit On");
  expect(body.journey).toMatchObject({
    v: 1,
    cars: expect.arrayContaining([
      { id: first.id, views: 1 },
      { id: second.id, views: 1 },
    ]),
    searches: [{ fuel: "diesel", condition: "used" }],
    tools: {},
  });
  expect((body.journey as { cars: unknown[] }).cars).toHaveLength(2);
  // The next enquiry starts with the switch off again.
  await dialog(page).getByRole("button", { name: "Close" }).last().click();
  await page.getByRole("button", { name: "Enquire", exact: true }).click();
  await expect(share(page)).not.toBeChecked();
});

test("a new tab starts its own, empty visit", async ({ page, context }) => {
  await browse(page);
  const other = await context.newPage();
  await stubTurnstile(other);
  await go(other, `/used-cars/${first.slug}`);
  await other.getByRole("button", { name: "Enquire", exact: true }).click();
  await dialog(other).getByText("What's shared").click();
  await expect(lines(other)).toHaveText(["1 car you looked at", "how long you've been on the site"]);
});
