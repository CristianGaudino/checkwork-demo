import type { Locator, Page } from "@playwright/test";

// Opening what folds on a phone (docs/mobile-navigation.md), so a test can reach what is inside.

// Groups that fold (the phone menu, the footer on a phone): open every closed one in `scope`, so all their links show.
// One at a time: the selector re-reads after each click, as an opened group is no longer a closed one.
export async function unfold(scope: Locator): Promise<Locator> {
  const closed = scope.locator("details:not([open]) > summary").filter({ visible: true });
  for (let n = await closed.count(); n > 0; n--) await closed.first().click();
  return scope;
}

// A number from text such as "€12,500" or "41 cars", and the prices on a page of stock as numbers.
export const digits = (s: string | null) => Number((s ?? "").replace(/\D/g, ""));
export const prices = (page: Page) => page.locator("article [data-price]").allTextContents().then((l) => l.map(digits));
