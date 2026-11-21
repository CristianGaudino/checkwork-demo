import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { choose } from "./combo";

type Demo = { id: string; slug: string; soldAt?: string; condition?: string };
const cars: Demo[] = JSON.parse(readFileSync(join(process.cwd(), "src/lib/stock/demo-cars.json"), "utf8"));
const [a, b] = cars.filter((c) => !c.soldAt && (c.condition ?? "used") === "used");

test("cars opened come back under Recently viewed, newest first, until cleared", async ({ page }) => {
  // The visit is noted once the page is running in the browser, as it is for anyone who reads the page.
  const stored = () => page.evaluate(() => Object.entries(localStorage).find(([k]) => k.endsWith(":recent-ids"))?.[1] ?? "[]");
  await page.goto(`/used-cars/${a.slug}`);
  await expect.poll(stored).toContain(a.id);
  await page.goto(`/used-cars/${b.slug}`);
  await expect.poll(stored).toContain(b.id);
  await page.goto("/");
  const recent = page.getByRole("region", { name: "Recently viewed" });
  await expect(recent).toBeVisible();
  const links = recent.locator("a[href^='/used-cars/']");
  await expect(links.first()).toHaveAttribute("href", `/used-cars/${b.slug}`);
  await recent.getByRole("button", { name: "Clear" }).click();
  await expect(recent).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("region", { name: "Recently viewed" })).toHaveCount(0);
});

test("on Saved cars, a car unsaved there keeps its card and does not show again under Recently viewed", async ({ page }) => {
  const stored = () => page.evaluate(() => Object.entries(localStorage).find(([k]) => k.endsWith(":recent-ids"))?.[1] ?? "[]");
  await page.goto(`/used-cars/${a.slug}`);
  await expect.poll(stored).toContain(a.id);
  await page.getByRole("button", { name: /^Save / }).first().click();
  await page.goto(`/used-cars/${b.slug}`);
  await expect.poll(stored).toContain(b.id);
  await page.goto("/saved");
  const recent = page.getByRole("region", { name: "Recently viewed" });
  await expect(recent.locator(`a[href="/used-cars/${b.slug}"]`).first()).toBeVisible();
  await expect(recent.locator(`a[href="/used-cars/${a.slug}"]`)).toHaveCount(0);
  await page.locator("main article").first().getByRole("button", { pressed: true }).click();
  await expect(recent.locator(`a[href="/used-cars/${b.slug}"]`).first()).toBeVisible();
  await expect(recent.locator(`a[href="/used-cars/${a.slug}"]`)).toHaveCount(0);
});

test("a half-filled form survives a reload, without the contact details", async ({ page }) => {
  await page.goto("/contact");
  const form = page.locator("form").filter({ has: page.getByLabel("Name") });
  const next = form.getByRole("button", { name: "Next", exact: true });
  await form.getByText("Something else", { exact: true }).click(); // moves on by itself
  await form.getByLabel("How can we help?").fill("Do you have a blue one?");
  await next.click();
  await form.getByLabel("Email", { exact: true }).fill("buyer@example.com");
  await page.reload();
  // The topic and the words come back; the contact details never do.
  await expect(form.getByRole("radio", { name: "Something else" })).toBeChecked();
  await expect(form.getByLabel("How can we help?")).toHaveValue("Do you have a blue one?");
  await expect(form.getByLabel("Email", { exact: true })).toHaveValue("");
});

test("no cars match: Ask us to find it opens Find a car with the search filled in", async ({ page }) => {
  await page.goto("/used-cars?make=volkswagen&priceMax=2500");
  const ask = page.getByRole("link", { name: /Ask us to find it/ });
  await expect(ask).toBeVisible();
  await ask.click();
  await page.waitForURL(/\/find-a-car\?/);
  await expect(page.getByLabel("Make")).toHaveValue("Volkswagen");
  // What the buyer changes wins over the link after a reload; a link for another make starts from that make.
  await choose(page.getByRole("combobox", { name: "Make" }), /^Audi$/);
  await expect(page.getByLabel("Make")).toHaveValue("Audi");
  await page.reload();
  await expect(page.getByLabel("Make")).toHaveValue("Audi");
  await page.goto("/find-a-car?make=bmw");
  await expect(page.getByLabel("Make")).toHaveValue("BMW");
});

test.describe("on a computer", () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test("leaving a car form with changes asks first, and No keeps the edits", async ({ page }) => {
    await page.goto("/dashboard/stock/new");
    await page.getByLabel("Year", { exact: true }).fill("2019");
    const asked: string[] = [];
    page.once("dialog", (d) => {
      asked.push(d.message());
      void d.dismiss();
    });
    await page.getByRole("link", { name: "Cancel" }).click();
    await expect.poll(() => asked).toEqual(["Leave without saving? Your changes will be lost."]);
    await expect(page).toHaveURL(/\/dashboard\/stock\/new$/);
    await expect(page.getByLabel("Year", { exact: true })).toHaveValue("2019");
    page.once("dialog", (d) => void d.accept());
    await page.getByRole("link", { name: "Cancel" }).click();
    await page.waitForURL(/\/dashboard\/stock$/);
  });

  test("a change made only in a dropdown asks too; a form left as it opened does not", async ({ page }) => {
    await page.goto("/dashboard/stock/new");
    let asked = 0;
    page.on("dialog", (d) => {
      asked++;
      void d.dismiss();
    });
    await choose(page.getByRole("combobox", { name: "Fuel" }), 1);
    await page.getByRole("link", { name: "Cancel" }).click();
    await expect.poll(() => asked).toBe(1);
    await expect(page).toHaveURL(/\/dashboard\/stock\/new$/);
    // A new tab: this one still holds the change, so the browser rightly asks before it reloads.
    const fresh = await page.context().newPage();
    fresh.on("dialog", (d) => {
      asked++;
      void d.dismiss();
    });
    await fresh.goto("/dashboard/stock/new");
    await fresh.getByRole("link", { name: "Cancel" }).click();
    await fresh.waitForURL(/\/dashboard\/stock$/);
    expect(asked).toBe(1);
  });

  test("contact: copy the number, and directions under the map", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/contact");
    await expect(page.getByRole("link", { name: /Get directions/ })).toHaveAttribute("target", "_blank");
    const copy = page.getByRole("button", { name: /^Copy / });
    const number = (await copy.textContent())!.replace(/^Copy /, "");
    await copy.click();
    await expect(page.getByRole("button", { name: "Number copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(number);
  });
});
