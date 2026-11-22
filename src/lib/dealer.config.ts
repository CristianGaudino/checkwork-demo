// The dealer's own business rules for the site, agreed with them at launch (docs/new-site-checklist.md). A change is ours to make, in this
// file, and a deploy. Plain data, safe for the browser.
export const DEALER_RULES = {
  // Days a sold car stays on the site after its sale.
  soldVisibleDays: 30,
} as const;
