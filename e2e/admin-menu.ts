import type { Page } from "@playwright/test";
import { DEALER_NAV } from "../src/lib/admin/nav";

// The dashboard sidebar (from 1024px). Its groups fold, so a link is reached the way a person reaches it: its group opened first if shut.
// A link a role must not have is looked for the same way, so its absence is real and not just a closed group.
export const sideMenu = (page: Page) => page.getByRole("navigation", { name: "Dealer dashboard" });

export async function sideLink(page: Page, label: string) {
  const group = DEALER_NAV.find((i) => i.label === label)?.group;
  const side = sideMenu(page);
  if (group) {
    const heading = side.getByRole("button", { name: group, exact: true });
    // On a phone this is the tab bar, with no group headings: nothing to open.
    if ((await heading.count()) && (await heading.getAttribute("aria-expanded")) === "false") await heading.click();
  }
  return side.getByRole("link", { name: label, exact: true });
}
