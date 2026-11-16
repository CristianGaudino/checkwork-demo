import type { AdminReview, Lead, Sale } from "@/lib/admin/collections";
import { addDays, addMonths, daysSince, dublinMs } from "@/lib/admin/format";
import { OPENING_HOURS, TIME_ZONE } from "@/lib/site";
import { forSale, isReduced, isSold, type Car } from "@/lib/stock/types";
import { DAY } from "@/lib/time";
import { OLD_STOCK_DAYS, isOldStock } from "@/lib/admin/overview";

// The dealer's figures for a range of Irish days, worked out from the records. One module for the monthly report, its email and the owner
// API (#174, #175), so the three never disagree. Pure, so every figure is tested. Counts only: nothing here holds a name, phone or email.
export type ReportData = { leads: Lead[]; cars: Car[]; sales: Sale[]; reviews: AdminReview[] };

// The moments a range of days starts and ends (the end excluded), in Irish time, so a month with a clock change is 31 days and an hour out.
export const bounds = (from: string, to: string) => [dublinMs(from, "00:00"), dublinMs(addDays(to, 1), "00:00")] as const;
export const monthRange = (month: string) => ({ from: `${month}-01`, to: addDays(addMonths(`${month}-01`, 1), -1) });
export const monthBefore = (month: string) => addMonths(`${month}-01`, -1).slice(0, 7);

const PARTS = new Intl.DateTimeFormat("en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE });
// The weekday (0 is Monday, as OPENING_HOURS lists them) and whether the shop was open at that moment.
export function openingAt(t: number): { weekday: number; open: boolean } {
  const p = Object.fromEntries(PARTS.formatToParts(t).map((x) => [x.type, x.value]));
  const i = OPENING_HOURS.findIndex((o) => o.day === p.weekday);
  const h = OPENING_HOURS[i];
  const hm = `${p.hour}:${p.minute}`;
  return { weekday: i, open: Boolean(h?.opens && h.closes && hm >= h.opens && hm < h.closes) };
}

export const median = (nums: number[]): number | null => {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const tally = <T>(list: T[], key: (x: T) => string) => list.reduce<Record<string, number>>((o, x) => ((o[key(x)] = (o[key(x)] ?? 0) + 1), o), {});

export type Summary = {
  range: { from: string; to: string };
  leads: { total: number; byType: Record<string, number>; bySource: Record<string, number>; byWeekday: number[]; outOfHours: number };
  // Minutes from a lead arriving to the first note on it (a call or message logged), split by when the lead came in. `none` is the leads
  // that nobody wrote to within 24 hours, once those 24 hours have passed.
  replies: { medianInHoursMin: number | null; medianOutOfHoursMin: number | null; none: number };
  // `inStock`, `avgDaysInStock`, `oldStock` (for sale OLD_STOCK_DAYS or more) and `priceDrops` are the stock now; `added` and `sold` are the range.
  stock: { inStock: number; added: number; sold: number; avgDaysInStock: number | null; oldStock: number; priceDrops: number };
  sales: { count: number; valueEur?: number };
  reviews: { count: number; average: number | null };
};

export function summarise(data: ReportData, from: string, to: string, now: number, opts: { money?: boolean } = {}): Summary {
  const [a, b] = bounds(from, to);
  const leads = data.leads.filter((l) => l.createdAt >= a && l.createdAt < b);
  const open = leads.map((l) => ({ l, ...openingAt(l.createdAt) }));
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const x of open) byWeekday[x.weekday]++;
  // The first note written after the lead came in: the site's own note at that moment (the email did not reach the dealer) is not a reply,
  // nor is a note the site wrote later (`auto`: a buyer's WhatsApp answer, a call-back reminder).
  const first = (l: Lead) => {
    const after = l.notes.filter((n) => n.at > l.createdAt && !n.auto).map((n) => n.at);
    return after.length ? Math.min(...after) : undefined;
  };
  const wait = (l: Lead) => {
    const f = first(l);
    return f === undefined ? undefined : Math.max(0, Math.round((f - l.createdAt) / 60_000));
  };
  const waits = (inHours: boolean) => open.filter((x) => x.open === inHours).map((x) => wait(x.l)).filter((n): n is number => n !== undefined);
  const none = leads.filter((l) => l.createdAt + DAY <= now && !((wait(l) ?? Infinity) <= 24 * 60)).length;

  const live = data.cars.filter(forSale);
  const ages = live.filter((c) => c.listedAt).map((c) => daysSince(c.listedAt!, now));
  const sales = data.sales.filter((s) => !s.returnedOn && s.soldOn >= from && s.soldOn <= to);
  const reviews = data.reviews.filter((r) => r.createdAt >= a && r.createdAt < b);

  return {
    range: { from, to },
    leads: { total: leads.length, byType: tally(leads, (l) => l.type), bySource: tally(leads, (l) => l.source), byWeekday, outOfHours: open.filter((x) => !x.open).length },
    replies: { medianInHoursMin: median(waits(true)), medianOutOfHoursMin: median(waits(false)), none },
    stock: {
      inStock: live.length,
      added: data.cars.filter((c) => c.listedAt && c.listedAt >= from && c.listedAt <= to).length,
      // A car sold in the range: marked sold on the stock, or with a sale recorded (a live sale's id is its car's id), counted once.
      sold: new Set([...data.cars.filter((c) => isSold(c) && c.soldAt! >= from && c.soldAt! <= to).map((c) => c.id), ...sales.map((s) => s.id)]).size,
      avgDaysInStock: ages.length ? Math.round(ages.reduce((n, d) => n + d, 0) / ages.length) : null,
      oldStock: data.cars.filter((c) => isOldStock(c, now)).length, // the dashboard's own rule
      priceDrops: live.filter(isReduced).length,
    },
    sales: { count: sales.length, ...(opts.money && { valueEur: sales.reduce((n, s) => n + s.priceEur, 0) }) },
    reviews: { count: reviews.length, average: reviews.length ? Math.round((reviews.reduce((n, r) => n + r.rating, 0) / reviews.length) * 10) / 10 : null },
  };
}

// A change on the month before, in words. Under five either month there is too little to say a percentage means anything.
export const TOO_FEW = 5;
export function compare(now: number, before: number): string {
  if (now < TOO_FEW || before < TOO_FEW) return "Too few to compare";
  const pct = Math.round(((now - before) / before) * 100);
  return pct === 0 ? "The same as the month before" : `${pct > 0 ? "Up" : "Down"} ${Math.abs(pct)}% on the month before`;
}

// One plain line on what to do, from fixed rules: the first that applies.
export function advice(s: Summary): string {
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  if (s.stock.oldStock) return `${n(s.stock.oldStock, "car", "cars")} for sale ${OLD_STOCK_DAYS} days or more: a price drop on ${s.stock.oldStock === 1 ? "this one" : "these"} could move ${s.stock.oldStock === 1 ? "it" : "them"}.`;
  if (s.replies.none) return `${n(s.replies.none, "lead", "leads")} had no reply in 24 hours: set up a follow-up so none are missed.`;
  if (s.leads.total >= TOO_FEW && s.leads.outOfHours / s.leads.total >= 0.4) return "Many leads came in out of hours: an automatic first reply could win them.";
  return "Nothing needs attention. Keep the stock fresh and the replies quick.";
}

const mins = (m: number | null) => (m === null ? "none" : m < 60 ? `${m} min` : `${Math.round(m / 6) / 10} h`);
export const fmtWait = mins;
