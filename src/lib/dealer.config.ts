// The dealer's own business rules, agreed with them at launch (docs/new-site-checklist.md). Not editable in the dashboard: a change is
// ours to make, in this file, and a deploy. Plain data, safe for the browser.
export const DEALER_RULES = {
  // A car for sale this long is old stock: the stock list's view, the dashboard, the reports and the slow-stock WhatsApp alert.
  oldStockDays: 120,
  // The price drop the slow-stock alert suggests, and its Drop the price button applies.
  slowDropEur: 500,
  // Days a sold car stays on the site after its sale.
  soldVisibleDays: 30,
  // A car sold in this many days with no sale recorded is asked about; older ones were sold before sales were kept.
  saleNudgeDays: 90,
} as const;
