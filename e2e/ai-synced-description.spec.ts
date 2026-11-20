import { expect, test } from "@playwright/test";
import { BASE } from "./open";

// A synced car can't be edited here, so AI improves its description to paste into DoneDeal (#225).
test("a synced car's description is improved with AI and copied for DoneDeal", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  await context.addCookies([{ name: "checkwork-demo-stock", value: "donedeal", url: BASE }]);
  await page.goto("/dashboard/stock");
  // With AI on, a synced car opens here rather than on the site.
  await page.locator('tbody a[href^="/dashboard/stock/"]').first().click();
  const panel = page.getByRole("region", { name: "Improve this description" });
  const box = panel.getByRole("textbox", { name: "Description" });
  await panel.getByRole("button", { name: "Write with AI" }).click();
  await expect(panel.getByText("AI draft", { exact: true })).toBeVisible();
  const first = await box.inputValue();
  await panel.getByRole("button", { name: "Shorter" }).click();
  await expect(box).not.toHaveValue(first);
  const text = await box.inputValue();
  expect(text).not.toMatch(/[—–]/);
  await panel.getByRole("button", { name: "Copy for DoneDeal" }).click();
  await expect(panel.getByRole("button", { name: "Copied" })).toBeVisible();
  expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r/g, "")).toBe(text); // Windows reads it back with CRLF
  await box.press("End");
  await box.pressSequentially(" Ask about finance.");
  await expect(panel.getByRole("button", { name: "Copy for DoneDeal" })).toBeVisible(); // an edit is not what was copied
});
