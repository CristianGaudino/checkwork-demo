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

// Slug is make, model, year and id, the same recipe as the feed (D-08). Keeping the id in it keeps every slug unique.
export const carSlug = (c: Pick<Car, "make" | "model" | "year" | "id">) => `${slugify(c.make)}-${slugify(c.model)}-${c.year}-${c.id}`;

