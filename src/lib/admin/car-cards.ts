import { daysSince, fmtEur } from "@/lib/admin/format";
import { carName, priceLabel } from "@/lib/stock/format";
import type { Car } from "@/lib/stock/types";

// A car as the car picker shows it: small, so a page can send the whole stock. `hint` puts a reason on the card (worth a post).
export type CarCard = { slug: string; title: string; photo?: string; price: string; days?: number; hint?: string };

export const carCards = (cars: Car[], hints: Map<string, string> = new Map(), now = Date.now()): CarCard[] =>
  cars.map((c) => ({
    slug: c.slug,
    title: carName(c),
    photo: c.photos[0]?.src,
    price: priceLabel(c),
    ...(c.listedAt && { days: daysSince(c.listedAt, now) }),
    ...(hints.has(c.slug) && { hint: hints.get(c.slug) }),
  }));
