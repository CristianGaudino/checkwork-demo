import { expect, test } from "@playwright/test";

test("analytics shows the totals, a chart with a text alternative, and a range that changes the figures", async ({ page }) => {
  await page.goto("/admin/analytics");
  await expect(page.getByRole("img", { name: /Visitors each day over the last 30 days/ })).toBeVisible();
  await expect(page.getByRole("table", { name: /Visitors each day/ })).toHaveCount(1);
  const visitors = async () => (await page.locator("p.text-display").first().textContent())!;
  const at30 = await visitors();
  await page.getByRole("link", { name: "Last 7 days" }).click();
  await expect(page).toHaveURL(/range=7/);
  expect(await visitors()).not.toBe(at30);
  await expect(page.getByRole("img", { name: /over the last 7 days/ })).toBeVisible();
});

test("every section is there, and the funnel never grows", async ({ page }) => {
  await page.goto("/admin/analytics");
  for (const name of ["From visit to sale", "Where visitors come from", "Where in Ireland", "Devices", "Most viewed cars"]) await expect(page.getByRole("heading", { name })).toBeVisible();
  // The first text of each number is the count; the share beside it is a second element.
  const counts = await page.getByRole("region", { name: "From visit to sale" }).locator("li span.font-semibold").evaluateAll((els) => els.map((e) => e.firstChild!.textContent!));
  const n = counts.map((t) => Number(t.replace(/,/g, "")));
  expect(n).toHaveLength(5);
  n.slice(1).forEach((v, i) => expect(v).toBeLessThanOrEqual(n[i]));
});

test("a bad range falls back to 30 days", async ({ page }) => {
  await page.goto("/admin/analytics?range=12345");
  await expect(page.getByRole("link", { name: "Last 30 days" })).toHaveAttribute("aria-current", "true");
});
