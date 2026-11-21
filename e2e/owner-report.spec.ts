import { expect, test } from "@playwright/test";

// The owner API (#174) and the monthly report (#175). OWNER_API_TOKEN is set for this run in playwright.config.ts.
const auth = { authorization: "Bearer e2e-owner-token" };

test("the owner API answers 404 without the token, or with a wrong one, and counts with it", async ({ request }) => {
  for (const path of ["summary", "usage", "modules"]) {
    expect((await request.get(`/api/owner/v1/${path}`)).status()).toBe(404);
    expect((await request.get(`/api/owner/v1/${path}`, { headers: { authorization: "Bearer wrong" } })).status()).toBe(404);
  }
  const res = await request.get("/api/owner/v1/summary?from=2026-01-01&to=2026-01-31", { headers: auth });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({ version: 1, range: { from: "2026-01-01", to: "2026-01-31" } });
  for (const key of ["leads", "replies", "stock", "sales", "reviews", "features", "dashboard", "modules", "listingSync", "usage", "appVersion"]) expect(body).toHaveProperty(key);
  expect(body.sales).not.toHaveProperty("valueEur"); // money is off without its own secret
  expect((await request.get("/api/owner/v1/summary?from=nope", { headers: auth })).status()).toBe(400);
  expect((await (await request.get("/api/owner/v1/modules", { headers: auth })).json()).modules).toContain("dashboard");
  expect((await (await request.get("/api/owner/v1/usage?from=2026-01-01&to=2026-01-31", { headers: auth })).json()).months).toHaveLength(1);
});

test("the counter takes an event from the list and nothing else", async ({ request }) => {
  expect((await request.post("/api/count", { data: { event: "compare" } })).status()).toBe(204);
  expect((await request.post("/api/count", { data: { event: "filter:colour" } })).status()).toBe(400);
  expect((await request.post("/api/count", { data: "not json", headers: { "content-type": "text/plain" } })).status()).toBe(400);
});

test("the monthly report shows a section for each module", async ({ page }) => {
  await page.goto("/dashboard/monthly-report");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Monthly report");
  for (const h of ["Leads", "Visitors", "Stock", "Sales", "Reviews"]) await expect(page.getByRole("heading", { level: 2, name: h, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Download/ })).toHaveCount(0);
});
