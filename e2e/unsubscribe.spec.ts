import { expect, test } from "@playwright/test";
import { unsubscribeToken } from "../src/lib/unsubscribe";

// The link in a newsletter or stock alert email (#122). The server's secret is set by playwright.config.ts.
const SECRET = "e2e-unsubscribe-secret";

test("the email link stops the newsletter in one press, with no login and no email address on the page", async ({ page }) => {
  // A seeded subscriber who is still subscribed.
  let t = "";
  for (let i = 500; i < 530 && !t; i++) {
    const token = await unsubscribeToken({ kind: "newsletter", id: `sub-${i}` }, SECRET);
    await page.goto(`/unsubscribe?t=${token}`);
    if (await page.getByRole("button", { name: "Unsubscribe" }).isVisible()) t = token;
  }
  expect(t).not.toBe("");
  await expect(page.getByText("Stop our newsletter?")).toBeVisible();
  await expect(page.locator("main")).not.toContainText("@");
  await page.getByRole("button", { name: "Unsubscribe" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("You are unsubscribed");
  // The same link again says so, and offers nothing to press.
  await page.goto(`/unsubscribe?t=${t}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("You are unsubscribed");
});

test("a forged, changed or empty link does nothing", async ({ page }) => {
  const token = await unsubscribeToken({ kind: "newsletter", id: "sub-500" }, "another-secret");
  for (const t of [token, token.replace("sub-500", "sub-501"), ""]) {
    await page.goto(`/unsubscribe?t=${t}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This link no longer works");
  }
});
