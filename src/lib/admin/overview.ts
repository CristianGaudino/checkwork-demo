import type { AdminReview, Lead, Order, Reservation, TestDrive } from "./collections";
import { DAY } from "@/lib/time";
import { forSale, isSold, type Car } from "@/lib/stock/types";
import { dublinDay } from "./format";
import { followUpDue, pastReplyTarget } from "./follow-ups";

// A car for sale this long is worth a look at its price (the stock list's "60 days or more" view).
export const OLD_STOCK_DAYS = 60;
// A car sold in this many days with no sale recorded is asked about; older ones were sold before sales were kept.
export const SALE_NUDGE_DAYS = 90;
export const isOldStock = (c: Car, now: number) => !isSold(c) && c.listedAt !== undefined && now - Date.parse(`${c.listedAt}T00:00:00Z`) >= OLD_STOCK_DAYS * DAY;

// The numbers on the dealer's overview, worked out from the records. Pure, so the rules are tested.
// How soon it needs doing, which is what its colour says: now (red, filled), soon (amber), or worth knowing (grey). Most urgent first.
export type Urgency = "now" | "soon" | "info";
export type Attention = { key: string; label: string; count: number; href: string; urgency: Urgency };
const RANK: Record<Urgency, number> = { now: 0, soon: 1, info: 2 };

// `cars`: the whole stock, sold too. `costs`: the car ids with a cost, only for staff with the margins permission. `syncProblem`: the
// DoneDeal sync is failing (only for stock from DoneDeal).
// `sales`: the car ids with a sale recorded. `reservations`: the deposits, for the ones past their date.
export function overview(input: { leads: Lead[]; drives: TestDrive[]; reviews: AdminReview[]; cars?: Car[]; costs?: Set<string>; sales?: Set<string>; reservations?: Reservation[]; orders?: Order[]; syncProblem?: boolean; now?: number; slaHours?: number }) {
  const now = input.now ?? Date.now();
  const slaHours = input.slaHours ?? 24;
  const { leads, drives, reviews } = input;
  const upcoming = drives.filter((d) => d.startsAt >= now && d.startsAt < now + 7 * DAY && (d.status === "requested" || d.status === "confirmed")).sort((a, b) => a.startsAt - b.startsAt);
  const rated = reviews.filter((r) => r.rating > 0);
  const cars = input.cars ?? [];
  const today = dublinDay(now);
  const offSale = new Set(cars.filter((c) => !forSale(c)).map((c) => c.slug));

  const due = leads.filter((l) => followUpDue(l, today));
  const attention = ([
    // Overdue follow-ups are late; ones due today are not yet.
    { key: "follow", label: "Follow-ups due", count: due.length, href: "/dashboard/leads?due=1", urgency: due.some((l) => l.followUpOn! < today) ? "now" : "soon" },
    { key: "slow", label: "New leads past your reply target", count: leads.filter((l) => pastReplyTarget(l, now, slaHours)).length, href: "/dashboard/leads?late=1", urgency: "now" },
    { key: "drives", label: "Test drives to confirm", count: drives.filter((d) => d.status === "requested" && d.startsAt >= now).length, href: "/dashboard/test-drives?status=requested", urgency: "soon" },
    { key: "reviews", label: "Reviews without a reply", count: reviews.filter((r) => !r.reply).length, href: "/dashboard/reviews?filter=unreplied", urgency: "info" },
    { key: "sync", label: "DoneDeal stock is not updating", count: input.syncProblem ? 1 : 0, href: "/dashboard/stock", urgency: "now" },
    { key: "sold-drives", label: "Test drives booked on a car no longer for sale", count: drives.filter((d) => d.startsAt >= now && (d.status === "requested" || d.status === "confirmed") && offSale.has(d.carSlug)).length, href: "/dashboard/test-drives", urgency: "now" },
    { key: "deposits", label: "Reservations past their date", count: (input.reservations ?? []).filter((r) => r.status === "held" && r.until < today).length, href: "/dashboard/stock?view=reserved", urgency: "now" },
    { key: "orders", label: "Ordered cars arrived, to hand over", count: (input.orders ?? []).filter((o) => o.status === "arrived").length, href: "/dashboard/orders?view=arrived", urgency: "soon" },
    { key: "taken-down", label: "DoneDeal ads taken down: did they sell?", count: cars.filter((c) => c.takenDownAt).length, href: "/dashboard/stock?view=hidden", urgency: "soon" },
    { key: "old", label: `Cars for sale ${OLD_STOCK_DAYS} days or more`, count: cars.filter((c) => isOldStock(c, now)).length, href: "/dashboard/stock?view=old", urgency: "info" },
    { key: "sales", label: "Sold cars with no sale recorded", count: input.sales ? cars.filter((c) => isSold(c) && Date.parse(`${c.soldAt}T00:00:00Z`) >= now - SALE_NUDGE_DAYS * DAY && !input.sales!.has(c.id)).length : 0, href: "/dashboard/stock?view=sold", urgency: "soon" },
    { key: "costs", label: "Cars for sale with no cost price", count: input.costs ? cars.filter((c) => !isSold(c) && !input.costs!.has(c.id)).length : 0, href: "/dashboard/margins", urgency: "info" },
  ] satisfies Attention[])
    .filter((a) => a.count > 0)
    .sort((a, b) => RANK[a.urgency] - RANK[b.urgency]); // stable: same urgency keeps this order

  // Leads in each of the last 8 weeks (7-day windows ending now), oldest first, and a usual week: the middle of the 7 before this one.
  const weeks = Array.from({ length: 8 }, (_, i) => leads.filter((l) => l.createdAt > now - (8 - i) * 7 * DAY && l.createdAt <= now - (7 - i) * 7 * DAY).length);
  const weekStarts = Array.from({ length: 8 }, (_, i) => now - (8 - i) * 7 * DAY + DAY);
  const before = weeks.slice(0, -1).sort((a, b) => a - b);
  return {
    weeks,
    weekStarts,
    usualWeek: before[Math.floor(before.length / 2)],
    lateLeads: leads.filter((l) => pastReplyTarget(l, now, slaHours)).length,
    oldStock: cars.filter((c) => isOldStock(c, now)).length,
    newLeads: leads.filter((l) => l.status === "new").length,
    upcomingDrives: upcoming,
    averageRating: rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0,
    reviewCount: rated.length,
    recentLeads: [...leads].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6),
    attention,
  };
}
