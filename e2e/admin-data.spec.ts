import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { sideLink } from "./admin-menu";
import { bookDrive, openDay } from "./days";

// Data requests and the list exports: personal data, owners and managers only.
const as = (context: import("@playwright/test").BrowserContext, role: string) => context.addCookies([{ name: "checkwork-demo-role", value: role, url: "http://localhost:3000" }]);

test("sales and finance have no data requests and no lead or customer exports; the stock export has no costs for them", async ({ page, context }) => {
  for (const role of ["Sales", "Finance"]) {
    await as(context, role);
    await page.goto("/dashboard");
    await expect(await sideLink(page, "Data requests")).toHaveCount(0);
    expect((await page.request.get("/dashboard/data-requests")).status()).toBe(404);
    expect((await page.request.get("/dashboard/leads/export")).status()).toBe(404);
    expect((await page.request.get("/dashboard/customers/export")).status()).toBe(404);
    await page.goto("/dashboard/leads");
    await expect(page.getByRole("link", { name: "Export CSV" })).toHaveCount(0);
  }
  await as(context, "Sales");
  const stock = await (await page.request.get("/dashboard/stock/export")).text();
  expect(stock.split("\r\n")[0]).not.toContain("Cost");
});

test("an owner exports the filtered leads as a CSV, and a manager's stock export has the costs", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dashboard/leads?status=new");
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Export CSV" }).click()]);
  expect(file.suggestedFilename()).toMatch(/^leads-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = readFileSync((await file.path())!, "utf8").replace(/^﻿/, "");
  const [head, ...rows] = csv.trim().split("\r\n");
  expect(head).toBe("Received,Name,Email,Phone,Type,Source,Status,Car,Registration,Message,With,Follow up");
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.every((r) => r.includes(",New,"))).toBe(true);
  await as(context, "Manager");
  expect((await (await page.request.get("/dashboard/stock/export")).text()).split("\r\n")[0]).toContain("Cost (€),Prep (€),Warranty repairs (€),Margin (€)");
});

test("a data request finds a person by email, including what they booked by phone, downloads a copy, and erases them", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const n = Date.now();
  const email = `pat.${n}@example.com`;
  const phone = `+353 83 ${String(n).slice(-7, -4)} ${String(n).slice(-4)}`;
  // A booking with a phone and an email, as staff take one at the desk.
  await bookDrive(page, { car: 3, day: openDay(n + 7), time: "15:00", name: "Pat Request", phone, email });
  await expect(page.getByText("Booked Pat Request for")).toBeVisible();

  await page.goto("/dashboard/data-requests");
  await page.getByLabel("Their email or phone number").fill(email.toUpperCase());
  await page.getByRole("button", { name: "Find" }).click();
  const held = page.getByRole("region", { name: /What we hold: 1 record/ });
  await expect(held).toContainText("Test drives");
  expect(page.url()).not.toContain("example.com"); // never in the address
  const [file] = await Promise.all([page.waitForEvent("download"), held.getByRole("button", { name: "Download a copy for them" }).click()]);
  const copy = JSON.parse(readFileSync((await file.path())!, "utf8"));
  expect(copy.testDrives[0]).toMatchObject({ name: "Pat Request", email });

  await expect(held.getByRole("button", { name: "Erase everything above" })).toBeDisabled();
  await held.getByLabel("I have checked this is the person asking").check();
  await held.getByRole("button", { name: "Erase everything above" }).click();
  await expect(page.getByRole("status")).toContainText("Erased 1 record.");
  await page.getByLabel("Their email or phone number").fill(phone);
  await page.getByRole("button", { name: "Find" }).click();
  await expect(page.getByRole("region", { name: "Nothing held" })).toBeVisible();
  await page.goto("/dashboard/activity?area=customers");
  await expect(page.getByText("Erased a person's data on request (1 record)").first()).toBeVisible();
});
