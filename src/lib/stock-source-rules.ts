// Where the dealer's stock comes from. "checkwork": the dealer adds and edits cars in the dashboard. "donedeal": the stock is read from the
// dealer's DoneDeal account and synced here, so it is edited on DoneDeal only. DoneDeal's API is licensed to one dealer's own site, with the
// dealer's written consent (DoneDeal API usage policy), which is exactly this case. Plain data, so client and server agree.
export const STOCK_SOURCES = ["checkwork", "donedeal"] as const;
export type StockSource = (typeof STOCK_SOURCES)[number];
export const STOCK_COOKIE = "checkwork-demo-stock";
export const parseStockSource = (v: string | undefined): StockSource => (v === "donedeal" ? "donedeal" : "checkwork");
// The listing site a synced dealer's stock comes from, as the dashboard names it: DoneDeal or CarsIreland. Both offer a dealer API for the
// dealer's own site, read the same way (src/lib/donedeal/, named for the first). Set per dealer; the code's "donedeal" means "synced".
export const LISTING_SITE = process.env.NEXT_PUBLIC_LISTING_SITE || "DoneDeal";
// The dealer's page on the listing site: where "Open DoneDeal" goes, and where a car goes until the sync stores each listing's own address.
export const DONEDEAL_DEALER_URL = process.env.NEXT_PUBLIC_DONEDEAL_DEALER_URL || "https://www.donedeal.ie/";
// The listing sites a car's ad may be on.
const LISTING_HOSTS = ["donedeal.ie", "carsireland.ie"];
// A car's own ad on the listing site, where it is edited; the dealer's page when the sync has not stored one. The address comes from the
// site's feed, so only an https link on a listing site is used: anything else (a javascript: link, a look-alike host) falls back to the
// dealer's page.
export function listingHref(car: { listingUrl?: string }): string {
  try {
    const u = new URL(car.listingUrl ?? "");
    if (u.protocol === "https:" && LISTING_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))) return u.href;
  } catch {
    // no address, or not one
  }
  return DONEDEAL_DEALER_URL;
}
