import { forSale, isReduced, isSold, type Car } from "@/lib/stock/types";
import { OLD_STOCK_DAYS, isOldStock } from "./overview";

// The stock list's views (each a summary tile and a filter) and its search, shared by the page and its CSV export.
export const FEW_PHOTOS = 4;
export const STOCK_VIEWS = {
  "for-sale": { label: "For sale", test: forSale },
  reduced: { label: "Reduced", test: (c: Car) => forSale(c) && isReduced(c) },
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
// The list's view and search, and its make, fuel and gearbox filters (a make's slug, a fuel, a gearbox; anything else matches no car). The
// page and the CSV export read the same, so the export is the list as it is filtered now.
export type StockFilters = { make?: string; fuel?: string; gearbox?: string };
export function parseStockList(sp: { view?: string; status?: string; q?: string; make?: string; fuel?: string; gearbox?: string }) {
  const asked = sp.view ?? sp.status;
  const view: StockView = asked && Object.hasOwn(STOCK_VIEWS, asked) ? (asked as StockView) : "for-sale";
  return { view, q: (sp.q ?? "").trim().toLowerCase().slice(0, 60), make: sp.make?.slice(0, 40) || undefined, fuel: sp.fuel?.slice(0, 20) || undefined, gearbox: sp.gearbox?.slice(0, 20) || undefined };
}

export const stockList = (all: Car[], view: StockView, q: string, { make, fuel, gearbox }: StockFilters = {}) =>
  all
    .filter(STOCK_VIEWS[view].test)
    .filter((c) => !q || `${c.make} ${c.model} ${c.variant ?? ""} ${c.year}`.toLowerCase().includes(q))
    .filter((c) => (!make || c.makeSlug === make) && (!fuel || c.fuel === fuel) && (!gearbox || c.gearbox === gearbox))
    .sort((a, b) => Number(b.id) - Number(a.id));
