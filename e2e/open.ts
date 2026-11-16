import { expect, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { ROLE_COOKIE } from "../src/lib/permission-rules";

// Opening what folds on a phone (docs/mobile-navigation.md), so a test can reach what is inside.

// The demo bar is a pill on a phone: open it (once the page has hydrated) and return the bar. From 640px it is already open.
export async function demoBar(page: Page): Promise<Locator> {
  const bar = page.locator("[data-demo-bar]");
  const pill = bar.getByRole("button", { name: /^Demo/ });
  if (await pill.isVisible()) {
    await expect(async () => {
      if ((await pill.getAttribute("aria-expanded")) !== "true") await pill.click();
      await expect(pill).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
    }).toPass();
  }
  return bar;
}

// Groups that fold (the phone menu, the footer on a phone): open every closed one in `scope`, so all their links show.
// One at a time: the selector re-reads after each click, as an opened group is no longer a closed one.
export async function unfold(scope: Locator): Promise<Locator> {
  const closed = scope.locator("details:not([open]) > summary").filter({ visible: true });
  for (let n = await closed.count(); n > 0; n--) await closed.first().click();
  return scope;
}

// View the dashboard as a member of the team with this role (src/lib/permission-rules.ts).
// The same address the run uses (playwright.config.ts), so it also works against E2E_BASE_URL.
const BASE = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
export const as = (context: BrowserContext, role: string) => context.addCookies([{ name: ROLE_COOKIE, value: role, url: BASE }]);

// A number from text such as "€12,500" or "41 cars", and the prices on a page of stock as numbers.
export const digits = (s: string | null) => Number((s ?? "").replace(/\D/g, ""));
export const prices = (page: Page) => page.locator("article [data-price]").allTextContents().then((l) => l.map(digits));
