import { expect, test } from "@playwright/test";

// The inbox shows made-up leads only (never the real lead table), filters through the URL, and a lead can be worked.
test("filters by status and search, and keeps the filter in the link", async ({ page }) => {
  await page.goto("/dashboard/leads");
  // How many the list holds, from its footer (a page shows 25 at most).
  const total = async () => Number((await page.getByText(/^Showing 1 to /).textContent())!.match(/of ([\d,]+)$/)![1].replace(/,/g, ""));
  const all = await total();
  expect(all).toBeGreaterThan(10);
  await page.getByRole("link", { name: /^Won/ }).click();
  await expect(page).toHaveURL(/status=won/);
  await expect.poll(total).toBeLessThan(all);
  await page.getByLabel("Search leads").fill("zzzz-nobody");
  await page.getByLabel("Search leads").press("Enter");
  await expect(page.getByText("No leads match")).toBeVisible();
  await expect(page).toHaveURL(/status=won/);
});

test("open a lead, change who has it and its status, add a note", async ({ page }) => {
  await page.goto("/dashboard/leads?status=new");
  await page.getByRole("row").nth(1).getByRole("link").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Contacted" }).click();
  await expect(page.getByRole("button", { name: "Contacted" })).toHaveAttribute("aria-pressed", "true");
  const person = page.getByRole("region", { name: "Who has it" }).getByRole("button").nth(1);
  await person.click();
  await expect(person).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Add a note").fill("Called, will visit on Saturday.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Called, will visit on Saturday.")).toBeVisible();
});

test("an unknown lead is a 404, and bad filters are ignored", async ({ page }) => {
  expect((await page.goto("/dashboard/leads/not-a-lead"))!.status()).toBe(404);
  await page.goto("/dashboard/leads?status=hacked&type=nope");
  expect((await page.getByRole("row").count()) - 1).toBeGreaterThan(10);
});

test("the list opens with what to answer now, and a lead moves on a step from its row, with Undo", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 }); // on a phone the row keeps one button (Call); the step is on the lead
  await page.goto("/dashboard/leads");
  const todo = page.getByRole("region", { name: /^To answer now/ });
  const first = todo.getByRole("listitem").first();
  await expect(first.getByRole("link", { name: /^(Call|Email|WhatsApp)/ })).toBeVisible();
  const href = (await first.locator('a[href^="/dashboard/leads/lead-"]').first().getAttribute("href"))!;
  const mark = first.getByRole("button", { name: /^Mark / });
  const to = (await mark.textContent())!.trim().replace(/^Mark /, "");
  // The lead's own page, in a second tab: "Where it stands" is what the store holds.
  const lead = await context.newPage();
  const status = () => lead.getByRole("group", { name: "Status" }).getByText(/^Where it stands/);
  await lead.goto(href);
  const before = (await status().textContent())!.trim();
  await mark.click();
  await expect(page.getByTestId("toast")).toContainText(new RegExp(to, "i"));
  await lead.reload();
  await expect(status()).toHaveText(new RegExp(`Where it stands\\s*${to}$`, "i"));
  await page.getByTestId("toast").getByRole("button", { name: "Undo" }).click();
  await expect.poll(async () => (await lead.reload(), (await status().textContent())?.trim())).toBe(before);
});

test("Book a test drive on a lead fills in their name and number", async ({ page }) => {
  await page.goto("/dashboard/leads/lead-4000");
  await page.getByRole("link", { name: "Book a test drive" }).click();
  await expect(page).toHaveURL(/test-drives\/new\?lead=lead-4000/);
  await page.getByRole("main").locator("li > button[aria-pressed]").first().click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Fiona Byrne");
});
