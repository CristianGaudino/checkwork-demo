import { forSale, isSold, type Car } from "@/lib/stock/types";
import { OLD_STOCK_DAYS, isOldStock } from "./overview";

// The stock list's views (each a summary tile and a filter) and its search, shared by the page and its CSV export.
export const FEW_PHOTOS = 4;
export const STOCK_VIEWS = {
  "for-sale": { label: "For sale", test: forSale },
  reduced: { label: "Reduced", test: (c: Car) => forSale(c) && c.wasPriceEur !== undefined && c.wasPriceEur > c.priceEur },
  photos: { label: "Need photos", test: (c: Car) => !isSold(c) && c.photos.length < FEW_PHOTOS },
  old: { label: `${OLD_STOCK_DAYS} days or more`, test: (c: Car) => isOldStock(c, Date.now()) },
  reserved: { label: "Reserved", test: (c: Car) => Boolean(c.reserved) && !isSold(c) },
  sold: { label: "Sold", test: (c: Car) => isSold(c) },
  // Off the website. A car whose DoneDeal ad came down is here, waiting for the dealer to say what happened.
  hidden: { label: "Hidden", test: (c: Car) => c.listing === "hidden" },
  drafts: { label: "Drafts", test: (c: Car) => c.listing === "draft" },
  all: { label: "All", test: () => true },
} as const;
export type StockView = keyof typeof STOCK_VIEWS;

// `status` is the old name for the view, kept so old links still work. Anything unknown is the For sale view.
export function parseStockList(sp: { view?: string; status?: string; q?: string }) {
  const asked = sp.view ?? sp.status;
  const view: StockView = asked && Object.hasOwn(STOCK_VIEWS, asked) ? (asked as StockView) : "for-sale";
  return { view, q: (sp.q ?? "").trim().toLowerCase().slice(0, 60) };
}

export const stockList = (all: Car[], view: StockView, q: string) =>
  all
    .filter(STOCK_VIEWS[view].test)
    .filter((c) => !q || `${c.make} ${c.model} ${c.variant ?? ""} ${c.year}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.id) - Number(a.id));
