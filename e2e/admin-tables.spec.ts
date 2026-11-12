import { expect, test } from "@playwright/test";

// The dashboard's tables, its bell, and where a warranty request goes (issues #143, #144, #146).

test("the search runs as you type, the cross clears it, and a header sorts the whole list", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dashboard/leads");
  const rows = page.getByRole("table").getByRole("row");
  const search = page.getByRole("textbox", { name: "Search leads" });
  await search.fill("ciaran");
  await expect(page).toHaveURL(/q=ciaran/); // no Enter
  await expect(rows.nth(1)).toContainText(/ciaran/i);
  await page.getByRole("button", { name: "Clear the search" }).click();
  await expect(page).not.toHaveURL(/q=/);
  await expect(search).toHaveValue("");
  // Left by another way (the menu): the box says what the list shows, never a search that is not applied.
  await search.fill("ciaran");
  await expect(page).toHaveURL(/q=ciaran/);
  await page.getByRole("navigation", { name: "Dealer dashboard" }).getByRole("link", { name: "Leads", exact: true }).click();
  await expect(page).not.toHaveURL(/q=/);
  await expect(search).toHaveValue("");
  // Sorted by name: A first one way, Z first the other, and the header says which.
  await page.getByRole("link", { name: /^Who/ }).click();
  await expect(page).toHaveURL(/sort=who&dir=asc/);
  await expect(page.getByRole("columnheader", { name: /Who/ })).toHaveAttribute("aria-sort", "ascending");
  const first = await rows.nth(1).getByRole("link").first().textContent();
  await page.getByRole("link", { name: /^Who/ }).click();
  await expect(page).toHaveURL(/dir=desc/);
  expect(((await rows.nth(1).getByRole("link").first().textContent()) ?? "").localeCompare(first ?? "")).toBeGreaterThan(0);
});

test("a filter narrows the list and stays in the link; Compact tightens the rows of every table", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dashboard/leads");
  await page.getByRole("combobox", { name: "Who has it" }).click();
  await page.getByRole("option", { name: "Nobody" }).click();
  await expect(page).toHaveURL(/with=none/);
  await expect(page.getByRole("table").getByRole("row").nth(1)).toContainText("Nobody");
  // Compact: the rows of this table and the next, kept for the person.
  const rowHeight = async () => (await page.getByRole("table").getByRole("row").nth(1).boundingBox())!.height;
  const roomy = await rowHeight();
  await page.getByRole("button", { name: "Compact" }).click();
  await expect(page.getByRole("button", { name: "Compact" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(rowHeight).toBeLessThan(roomy);
  await page.goto("/dashboard/customers");
  await expect(page.getByRole("button", { name: "Compact" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Compact" }).click(); // back, for the tests after
});

test("a warranty request waits in Aftersales, not in Leads", async ({ page }) => {
  await page.goto("/dashboard/leads");
  await expect(page.getByRole("link", { name: "Warranty claim", exact: true })).toHaveCount(0); // no type chip
  await page.goto("/dashboard/aftersales");
  await expect(page.getByRole("link", { name: /^Requests/ })).toHaveAttribute("aria-current", "true");
  await page.getByRole("table").getByRole("link").first().click();
  await expect(page.getByRole("link", { name: "Aftersales", exact: true })).toBeVisible(); // the way back
  await expect(page.getByRole("link", { name: "Open a claim" })).toBeVisible();
});

test("the bell shows what came in, unread first, and Mark all as read clears its count", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dashboard");
  const bell = page.getByRole("button", { name: /^Notifications, \d+ unread$/ });
  await expect(bell).toBeVisible();
  await bell.click();
  const panel = page.getByRole("region", { name: "Notifications" }).or(page.locator("[popover]").filter({ hasText: "Notifications" }));
  await expect(panel.getByText("Warranty request").first()).toBeVisible();
  await panel.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
});
