// Where the dealer's stock comes from. "checkwork": the dealer adds and edits cars in the dashboard. "donedeal": the stock is read from the
// dealer's DoneDeal account and synced here, so it is edited on DoneDeal only. DoneDeal's API is licensed to one dealer's own site, with the
// dealer's written consent (DoneDeal API usage policy), which is exactly this case. Plain data, so client and server agree.
export const STOCK_SOURCES = ["checkwork", "donedeal"] as const;
export type StockSource = (typeof STOCK_SOURCES)[number];
export const STOCK_COOKIE = "checkwork-demo-stock";
export const parseStockSource = (v: string | undefined): StockSource => (v === "donedeal" ? "donedeal" : "checkwork");
// The dealer's page on DoneDeal: where "Open DoneDeal" goes, and where a car goes until the sync stores each listing's own address.
export const DONEDEAL_DEALER_URL = process.env.NEXT_PUBLIC_DONEDEAL_DEALER_URL || "https://www.donedeal.ie/";
// A car's own ad on DoneDeal, where it is edited; the dealer's page when the sync has not stored one. The address comes from DoneDeal's
// feed, so only an https link on donedeal.ie is used: anything else (a javascript: link, a look-alike host) falls back to the dealer's page.
export function listingHref(car: { listingUrl?: string }): string {
  try {
    const u = new URL(car.listingUrl ?? "");
    if (u.protocol === "https:" && (u.hostname === "donedeal.ie" || u.hostname.endsWith(".donedeal.ie"))) return u.href;
  } catch {
    // no address, or not one
  }
  return DONEDEAL_DEALER_URL;
}
