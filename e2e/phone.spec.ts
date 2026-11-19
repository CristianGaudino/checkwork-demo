import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { stubTurnstile } from "./turnstile";

// Runs only on the local server with fake backends: it must never send a lead to a deployed site.
test.skip(Boolean(process.env.E2E_BASE_URL), "Lead specs never run against a deployed site");

const live = (JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8")) as { slug: string; soldAt?: string }[]).find((c) => !c.soldAt)!;

test.beforeEach(async ({ page }) => stubTurnstile(page));

// Sends an enquiry with what was typed or pasted in Phone, and answers the phone the server received. The form is built from the page, so
// this is what reaches the dealer. A server action posts multipart and prefixes each field name with a reference id ("_1_phone").
async function sendPhone(page: Page, typed: string) {
  await page.goto(`/used-cars/${live.slug}`);
  await page.waitForFunction(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__reactFiber")));
  await page.getByRole("button", { name: "Enquire", exact: true }).click();
  const d = page.getByRole("dialog", { name: "Enquire" });
  await d.getByLabel("Name").fill("Phone buyer");
  await d.getByLabel("Phone", { exact: true }).fill(typed);
  await d.getByRole("checkbox").check();
  const sent = page.waitForRequest((r) => r.method() === "POST" && /name="[^"]*phone"/.test(r.postDataBuffer()?.toString() ?? ""));
  await d.getByRole("button", { name: "Send enquiry" }).click();
  const body = (await sent).postDataBuffer()!.toString();
  await expect(d.getByRole("heading", { name: "Thanks, we have your enquiry." })).toBeVisible();
  return body.match(/name="[^"]*phone"\r\n\r\n([^\r]*)/)?.[1];
}

test("an Irish number reaches the dealer with its code", async ({ page }) => {
  expect(await sendPhone(page, "087 123 4567")).toBe("+353 87 123 4567");
});

test("a number pasted with another country's code switches the country and keeps that code", async ({ page }) => {
  expect(await sendPhone(page, "+44 7700 900123")).toBe("+44 7700 900123");
});

test("00 before a code is read as that code, and a stray + before a local number is dropped", async ({ page }) => {
  expect(await sendPhone(page, "00353871234567")).toBe("+353 871234567");
  expect(await sendPhone(page, "+0871234567")).toBe("+353 871234567");
});
