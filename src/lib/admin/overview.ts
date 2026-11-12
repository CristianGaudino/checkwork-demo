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
export type Attention = { key: string; label: string; count: number; href: string };

// `cars`: the whole stock, sold too. `costs`: the car ids with a cost, only for staff with the margins permission. `syncProblem`: the
// DoneDeal sync is failing (only for stock from DoneDeal).
// `sales`: the car ids with a sale recorded. `reservations`: the deposits, for the ones past their date.
export function overview(input: { leads: Lead[]; drives: TestDrive[]; reviews: AdminReview[]; cars?: Car[]; costs?: Set<string>; sales?: Set<string>; reservations?: Reservation[]; orders?: Order[]; syncProblem?: boolean; now?: number; slaHours?: number }) {
  const now = input.now ?? Date.now();
  const slaHours = input.slaHours ?? 24;
  const { leads, drives, reviews } = input;
  const week = leads.filter((l) => l.createdAt >= now - 7 * DAY);
  const prevWeek = leads.filter((l) => l.createdAt >= now - 14 * DAY && l.createdAt < now - 7 * DAY);
  const decided = leads.filter((l) => l.status === "won" || l.status === "lost");
  const won = leads.filter((l) => l.status === "won");
  const upcoming = drives.filter((d) => d.startsAt >= now && d.startsAt < now + 7 * DAY && (d.status === "requested" || d.status === "confirmed")).sort((a, b) => a.startsAt - b.startsAt);
  const rated = reviews.filter((r) => r.rating > 0);
  const cars = input.cars ?? [];
  const today = dublinDay(now);
  const offSale = new Set(cars.filter((c) => !forSale(c)).map((c) => c.slug));

  const attention: Attention[] = [
    { key: "follow", label: "Follow-ups due", count: leads.filter((l) => followUpDue(l, today)).length, href: "/dashboard/leads?due=1" },
    { key: "slow", label: "New leads past your reply target", count: leads.filter((l) => pastReplyTarget(l, now, slaHours)).length, href: "/dashboard/leads?late=1" },
    { key: "drives", label: "Test drives to confirm", count: drives.filter((d) => d.status === "requested" && d.startsAt >= now).length, href: "/dashboard/test-drives?status=requested" },
    { key: "reviews", label: "Reviews without a reply", count: reviews.filter((r) => !r.reply).length, href: "/dashboard/reviews?filter=unreplied" },
    { key: "sync", label: "DoneDeal stock is not updating", count: input.syncProblem ? 1 : 0, href: "/dashboard/stock" },
    { key: "sold-drives", label: "Test drives booked on a car no longer for sale", count: drives.filter((d) => d.startsAt >= now && (d.status === "requested" || d.status === "confirmed") && offSale.has(d.carSlug)).length, href: "/dashboard/test-drives" },
    { key: "deposits", label: "Reservations past their date", count: (input.reservations ?? []).filter((r) => r.status === "held" && r.until < today).length, href: "/dashboard/stock?view=reserved" },
    { key: "orders", label: "Ordered cars arrived, to hand over", count: (input.orders ?? []).filter((o) => o.status === "arrived").length, href: "/dashboard/orders?view=arrived" },
    { key: "taken-down", label: "DoneDeal ads taken down: did they sell?", count: cars.filter((c) => c.takenDownAt).length, href: "/dashboard/stock?view=hidden" },
    { key: "old", label: `Cars for sale ${OLD_STOCK_DAYS} days or more`, count: cars.filter((c) => isOldStock(c, now)).length, href: "/dashboard/stock?view=old" },
    { key: "sales", label: "Sold cars with no sale recorded", count: input.sales ? cars.filter((c) => isSold(c) && Date.parse(`${c.soldAt}T00:00:00Z`) >= now - SALE_NUDGE_DAYS * DAY && !input.sales!.has(c.id)).length : 0, href: "/dashboard/stock?view=sold" },
    { key: "costs", label: "Cars for sale with no cost price", count: input.costs ? cars.filter((c) => !isSold(c) && !input.costs!.has(c.id)).length : 0, href: "/dashboard/margins" },
  ].filter((a) => a.count > 0);

  return {
    leadsThisWeek: week.length,
    leadsChange: week.length - prevWeek.length,
    newLeads: leads.filter((l) => l.status === "new").length,
    winRate: decided.length ? (won.length / decided.length) * 100 : 0,
    upcomingDrives: upcoming,
    averageRating: rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0,
    reviewCount: rated.length,
    recentLeads: [...leads].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6),
    attention,
  };
}
