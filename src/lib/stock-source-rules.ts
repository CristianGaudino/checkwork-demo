// Where the dealer's stock comes from. "checkwork": the dealer adds and edits cars in the dealer dashboard. "donedeal": the stock is read
// from the dealer's DoneDeal account and synced there, so it is edited on DoneDeal only, and the site has no factory orders. Plain data.
export const STOCK_SOURCES = ["checkwork", "donedeal"] as const;
export type StockSource = (typeof STOCK_SOURCES)[number];
export const parseStockSource = (v: string | undefined): StockSource => (v === "donedeal" ? "donedeal" : "checkwork");
