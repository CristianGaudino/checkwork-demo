import { expect, test } from "@playwright/test";

test("analytics shows the totals, a chart with a text alternative, and a range that changes the figures", async ({ page }) => {
  await page.goto("/dashboard/analytics");
  await expect(page.getByRole("img", { name: /Visitors each day over the last 30 days/ })).toBeVisible();
  await expect(page.getByRole("table", { name: /Visitors each day/ })).toHaveCount(1);
  const visitors = async () => (await page.locator("main p.tabular-nums").first().textContent())!; // the first stat card's figure
  const at30 = await visitors();
  await page.getByRole("navigation", { name: "Period" }).getByRole("link", { name: "7 days" }).click();
  await expect(page).toHaveURL(/range=7/);
  expect(await visitors()).not.toBe(at30);
  await expect(page.getByRole("img", { name: /over the last 7 days/ })).toBeVisible();
});

test("every section is there, and the funnel never grows", async ({ page }) => {
  await page.goto("/dashboard/analytics");
  await page.getByText("More detail", { exact: true }).click(); // where in Ireland and devices are folded under the main figures
  for (const name of ["From visit to sale", "Where visitors come from", "Where in Ireland", "Devices", "Most viewed cars"]) await expect(page.getByRole("heading", { name })).toBeVisible();
  // The first text of each number is the count; the share beside it is a second element.
  const counts = await page.getByRole("region", { name: "From visit to sale" }).locator("li span.font-semibold").evaluateAll((els) => els.map((e) => e.firstChild!.textContent!));
  const n = counts.map((t) => Number(t.replace(/,/g, "")));
  expect(n).toHaveLength(5);
  n.slice(1).forEach((v, i) => expect(v).toBeLessThanOrEqual(n[i]));
});

test("a bad range falls back to 30 days", async ({ page }) => {
  await page.goto("/dashboard/analytics?range=12345");
  await expect(page.getByRole("navigation", { name: "Period" }).getByRole("link", { name: "30 days" })).toHaveAttribute("aria-current", "page");
});

test("a salesperson sees their own sales, never the dealership's, and the funnel stops before sales", async ({ page, context, baseURL }) => {
  const funnel = page.getByRole("region", { name: "From visit to sale" }).getByRole("listitem");
  await page.goto("/dashboard/analytics");
  const steps = await funnel.count();
  await expect(page.getByText("Sales you recorded")).toBeVisible();
  await context.addCookies([{ name: "checkwork-demo-role", value: "Sales", url: baseURL! }]);
  await page.reload();
  await expect(page.getByText("Your own sales")).toBeVisible();
  await expect(page.getByText(/, and you sold \d+\./)).toBeVisible();
  await expect(funnel).toHaveCount(steps - 1);
  await expect(page.getByText("Bought a car")).toHaveCount(0);
  await context.clearCookies({ name: "checkwork-demo-role" });
});
