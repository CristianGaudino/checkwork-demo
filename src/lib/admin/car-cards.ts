import { fmtEur } from "@/lib/admin/format";
import { carName } from "@/lib/stock/format";
import type { Car } from "@/lib/stock/types";
import { DAY } from "@/lib/time";

// A car as the car picker shows it: small, so a page can send the whole stock. `hint` puts a reason on the card (worth a post).
export type CarCard = { slug: string; title: string; photo?: string; price: string; days?: number; hint?: string };

const daysSince = (listedAt: string, now: number) => Math.max(0, Math.floor((now - Date.parse(`${listedAt}T00:00:00Z`)) / DAY));

export const carCards = (cars: Car[], hints: Map<string, string> = new Map(), now = Date.now()): CarCard[] =>
  cars.map((c) => ({
    slug: c.slug,
    title: carName(c),
    photo: c.photos[0]?.src,
    price: fmtEur(c.priceEur),
    ...(c.listedAt && { days: daysSince(c.listedAt, now) }),
    ...(hints.has(c.slug) && { hint: hints.get(c.slug) }),
  }));
