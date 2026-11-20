import type { AdminReview, Lead, Order, Reservation, TestDrive } from "./collections";
import { DAY } from "@/lib/time";
import { forSale, isSold, type Car } from "@/lib/stock/types";
import { isOpenDrive } from "./drives";
import { dublinDay } from "./format";
import { followUpDue, pastReplyTarget } from "./follow-ups";
import { LISTING_SITE } from "@/lib/stock-source-rules";
import { DEALER_RULES } from "@/lib/dealer.config";

// The dealer's settings (dealer.config.ts): old stock, and the sold cars asked about.
export const OLD_STOCK_DAYS = DEALER_RULES.oldStockDays;
export const SALE_NUDGE_DAYS = DEALER_RULES.saleNudgeDays;
export const isOldStock = (c: Car, now: number) => forSale(c) && c.listedAt !== undefined && now - Date.parse(`${c.listedAt}T00:00:00Z`) >= OLD_STOCK_DAYS * DAY;

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
  const upcoming = drives.filter((d) => d.startsAt >= now && d.startsAt < now + 7 * DAY && isOpenDrive(d)).sort((a, b) => a.startsAt - b.startsAt);
  const rated = reviews.filter((r) => r.rating > 0);
  const cars = input.cars ?? [];
  const today = dublinDay(now);
  const offSale = new Set(cars.filter((c) => !forSale(c)).map((c) => c.slug));

  // The records behind the to-dos the overview lists one by one, each in the order to work them: the longest waiting first, the soonest next.
  const due = leads.filter((l) => followUpDue(l, today)).sort((a, b) => a.followUpOn!.localeCompare(b.followUpOn!));
  const late = leads.filter((l) => pastReplyTarget(l, now, slaHours)).sort((a, b) => a.createdAt - b.createdAt);
  const toConfirm = drives.filter((d) => d.status === "requested" && d.startsAt >= now).sort((a, b) => a.startsAt - b.startsAt);
  const unrecorded = input.sales ? cars.filter((c) => isSold(c) && Date.parse(`${c.soldAt}T00:00:00Z`) >= now - SALE_NUDGE_DAYS * DAY && !input.sales!.has(c.id)) : [];
  const attention = ([
    // Overdue follow-ups are late; ones due today are not yet.
    { key: "follow", label: "Follow-ups due", count: due.length, href: "/dashboard/leads?need=due", urgency: due.some((l) => l.followUpOn! < today) ? "now" : "soon" },
    { key: "slow", label: "New leads past your reply target", count: late.length, href: "/dashboard/leads?need=late", urgency: "now" },
    { key: "drives", label: "Test drives to confirm", count: toConfirm.length, href: "/dashboard/test-drives?view=list&status=requested&when=ahead", urgency: "soon" },
    { key: "reviews", label: "Reviews without a reply", count: reviews.filter((r) => !r.reply).length, href: "/dashboard/reviews?filter=unreplied", urgency: "info" },
    { key: "sync", label: `${LISTING_SITE} stock is not updating`, count: input.syncProblem ? 1 : 0, href: "/dashboard/stock", urgency: "now" },
    { key: "sold-drives", label: "Test drives booked on a car no longer for sale", count: drives.filter((d) => d.startsAt >= now && isOpenDrive(d) && offSale.has(d.carSlug)).length, href: "/dashboard/test-drives?view=list&car=gone&when=ahead", urgency: "now" },
    { key: "deposits", label: "Reservations past their date", count: (input.reservations ?? []).filter((r) => r.status === "held" && r.until < today).length, href: "/dashboard/stock?view=reserved", urgency: "now" },
    { key: "orders", label: "Ordered cars arrived, to hand over", count: (input.orders ?? []).filter((o) => o.status === "arrived").length, href: "/dashboard/orders?view=arrived", urgency: "soon" },
    { key: "taken-down", label: `${LISTING_SITE} ads taken down: did they sell?`, count: cars.filter((c) => c.takenDownAt).length, href: "/dashboard/stock?view=hidden", urgency: "soon" },
    { key: "old", label: `Cars for sale ${OLD_STOCK_DAYS} days or more`, count: cars.filter((c) => isOldStock(c, now)).length, href: "/dashboard/stock?view=old", urgency: "info" },
    { key: "sales", label: "Sold cars with no sale recorded", count: unrecorded.length, href: "/dashboard/stock?view=sold", urgency: "soon" },
    { key: "costs", label: "Cars for sale with no cost price", count: input.costs ? cars.filter((c) => !isSold(c) && !input.costs!.has(c.id)).length : 0, href: "/dashboard/margins", urgency: "info" },
  ] satisfies Attention[])
    .filter((a) => a.count > 0)
    .sort((a, b) => RANK[a.urgency] - RANK[b.urgency]); // stable: same urgency keeps this order

  // Leads in each of the last 8 weeks (7-day windows ending now), oldest first, and a usual week: the middle of the 7 before this one.
  const weeks = Array.from({ length: 8 }, (_, i) => leads.filter((l) => l.createdAt > now - (8 - i) * 7 * DAY && l.createdAt <= now - (7 - i) * 7 * DAY).length);
  const before = weeks.slice(0, -1).sort((a, b) => a - b);
  return {
    weeks,
    usualWeek: before[Math.floor(before.length / 2)],
    lateLeads: late.length,
    late,
    due,
    toConfirm,
    unrecorded,
    // Today's open drives, the earlier ones too (a confirmed one this morning may still be out), in time order.
    now, // the time these were worked out at, for the page's own "has it started" checks
    todayDrives: drives.filter((d) => isOpenDrive(d) && dublinDay(d.startsAt) === today).sort((a, b) => a.startsAt - b.startsAt),
    oldStock: cars.filter((c) => isOldStock(c, now)).length,
    newLeads: leads.filter((l) => l.status === "new").length,
    upcomingDrives: upcoming,
    averageRating: rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0,
    reviewCount: rated.length,
    recentLeads: [...leads].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6),
    attention,
  };
}
