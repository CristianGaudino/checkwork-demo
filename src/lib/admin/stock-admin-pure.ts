import { isSold, type Car } from "@/lib/stock/types";

// The parts of stock admin that need no database, so they can be tested and shared with the form.
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Ids are digits only (the slug ends in one, and the proxy tells a car URL by that), so a new car takes the next number up. `existing` is
// every id still in use, by a car or by a record that names one (a sale, a deposit): an id is never given out twice, so a new car can never
// take over a deleted car's sale.
export function nextCarId(existing: { id: string }[]) {
  return String(Math.max(0, ...existing.map((c) => Number(c.id) || 0)) + 1);
}

// The day a car first went on the website: kept once it has one. A car on the website keeps what it has, so an edit never invents a date
// for one from before dates were kept (it would read as new). A car coming on (added live, a draft published) without one gets today.
export const listedOn = (was: Pick<Car, "listing" | "listedAt"> | undefined, live: boolean, today: string) =>
  was && !was.listing ? was.listedAt : (was?.listedAt ?? (live ? today : undefined));

// Slug is make, model, year and id, the same recipe as the feed (D-08). Keeping the id in it keeps every slug unique.
export const carSlug = (c: Pick<Car, "make" | "model" | "year" | "id">) => `${slugify(c.make)}-${slugify(c.model)}-${c.year}-${c.id}`;

// Where a car stands, the same on every page and in the export: off the website first (draft, hidden), then sold, reserved or for sale.
export const CAR_STATUSES = ["Draft", "Hidden", "Sold", "Reserved", "For sale"] as const;
export type CarStatus = (typeof CAR_STATUSES)[number];
export const carStatus = (c: Pick<Car, "listing" | "soldAt" | "reserved">): CarStatus =>
  c.listing === "draft" ? "Draft" : c.listing ? "Hidden" : isSold(c) ? "Sold" : c.reserved ? "Reserved" : "For sale";
