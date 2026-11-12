import type { Car } from "@/lib/stock/types";

// The parts of stock admin that need no database, so they can be tested and shared with the form.
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Ids are digits only (the slug ends in one, and the proxy tells a car URL by that), so a new car takes the next number up.
export function nextCarId(existing: Car[]) {
  return String(Math.max(0, ...existing.map((c) => Number(c.id) || 0)) + 1);
}

// The day a car first went on the website: kept once it has one. A car on the website keeps what it has, so an edit never invents a date
// for one from before dates were kept (it would read as new). A car coming on (added live, a draft published) without one gets today.
export const listedOn = (was: Pick<Car, "listing" | "listedAt"> | undefined, live: boolean, today: string) =>
  was && !was.listing ? was.listedAt : (was?.listedAt ?? (live ? today : undefined));

// Slug is make, model, year and id, the same recipe as the feed (D-08). Keeping the id in it keeps every slug unique.
export const carSlug = (c: Pick<Car, "make" | "model" | "year" | "id">) => `${slugify(c.make)}-${slugify(c.model)}-${c.year}-${c.id}`;

