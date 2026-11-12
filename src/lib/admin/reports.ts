import type { Lead, Sale } from "./collections";
import type { PrepKind, PrepLine } from "./prep";
import { isSold, type Car } from "@/lib/stock/types";
import { DAY } from "@/lib/time";
import { dublinDay } from "./format";
import { followUpDue } from "./follow-ups";

// The Reports page's figures, worked out from the records. Pure, so every figure is tested.
// A period is the last 3, 6 or 12 months, counted in whole Irish calendar months, this one included.
export const PERIODS = [3, 6, 12] as const;
export type Period = (typeof PERIODS)[number];

const MONTH = new Intl.DateTimeFormat("en-IE", { month: "short", year: "numeric", timeZone: "UTC" });
// The months of a period, oldest first, as "2026-11".
export function monthsOf(period: Period, today: string): string[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: period }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (period - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}
export const monthLabel = (month: string) => MONTH.format(new Date(`${month}-01T12:00:00Z`));
const leadMonth = (l: Lead) => dublinDay(l.createdAt).slice(0, 7);
const rate = (won: number, of: number) => (of ? Math.round((won / of) * 100) : 0);

export type MonthRow = { month: string; sold: number; value: number; profit: number; costed: number };
export type PersonRow = { name: string; sold: number; value: number; profit: number; costed: number; leads: number; won: number; winRate: number };
export type SourceRow = { source: string; leads: number; won: number; winRate: number };
export type AgeRow = { band: string; cars: number; value: number };
export type PrepRow = { kind: PrepKind; eur: number; lines: number };
export type FullReport = {
  months: MonthRow[];
  totals: { sold: number; value: number; profit: number; costed: number; avgDaysToSell: number | null };
  returns: { count: number; refundEur: number }; // sales undone in the period (by the day undone): cancelled or brought back
  people: PersonRow[];
  sources: SourceRow[];
  lost: { reason: string; leads: number }[]; // the period's lost leads by the reason given, most first; "Not said" for none
  stockAge: AgeRow[];
  prep: PrepRow[];
};

// `costs`: each car's whole cost (cost price and prep), for profit. A sale with no cost is counted in sales and value, not in profit,
// and `costed` says how many were.
export function fullReport(input: { sales: Sale[]; cars: Car[]; leads: Lead[]; team: string[]; costs: Map<string, number>; prep: { id: string; lines: PrepLine[] }[]; period: Period; now: number }): FullReport {
  const today = dublinDay(input.now);
  const months = monthsOf(input.period, today);
  const inPeriod = new Set(months);
  // An undone sale is not a sale: it is left out of every figure and counted under returns instead.
  const sales = input.sales.filter((s) => !s.returnedOn && inPeriod.has(s.soldOn.slice(0, 7)));
  const undone = input.sales.filter((s) => s.returnedOn && inPeriod.has(s.returnedOn.slice(0, 7)));
  const leads = input.leads.filter((l) => inPeriod.has(leadMonth(l)));
  const profitOf = (s: Sale) => (input.costs.has(s.id) ? s.priceEur - input.costs.get(s.id)! : undefined);
  const sum = (list: Sale[]) =>
    list.reduce((t, s) => {
      const p = profitOf(s);
      return { sold: t.sold + 1, value: t.value + s.priceEur, profit: t.profit + (p ?? 0), costed: t.costed + (p === undefined ? 0 : 1) };
    }, { sold: 0, value: 0, profit: 0, costed: 0 });

  const carOf = new Map(input.cars.map((c) => [c.id, c]));
  const days = sales.map((s) => carOf.get(s.id)?.listedAt && Math.round((Date.parse(`${s.soldOn}T12:00:00Z`) - Date.parse(`${carOf.get(s.id)!.listedAt}T12:00:00Z`)) / DAY)).filter((d): d is number => typeof d === "number" && d >= 0);

  // Everyone on the team, then anyone who sold or had leads and has since left, so a past salesperson's figures are not lost.
  const names = [...new Set([...input.team, ...sales.map((s) => s.salesperson).filter((n): n is string => Boolean(n)), ...leads.map((l) => l.assignedTo).filter((n): n is string => Boolean(n))])];
  const people = names
    .map((name) => {
      const mine = leads.filter((l) => l.assignedTo === name);
      const won = mine.filter((l) => l.status === "won").length;
      return { name, ...sum(sales.filter((s) => s.salesperson === name)), leads: mine.length, won, winRate: rate(won, mine.length) };
    })
    .filter((p) => p.sold || p.leads)
    .sort((a, b) => b.sold - a.sold || b.won - a.won || a.name.localeCompare(b.name));

  const sources = [...new Set(leads.map((l) => l.source))]
    .map((source) => {
      const of = leads.filter((l) => l.source === source);
      const won = of.filter((l) => l.status === "won").length;
      return { source, leads: of.length, won, winRate: rate(won, of.length) };
    })
    .sort((a, b) => b.won - a.won || b.leads - a.leads);

  // Cars for sale now, by how long they have been listed.
  const BANDS: [string, number, number][] = [["Under 30 days", 0, 30], ["30 to 59 days", 30, 60], ["60 to 89 days", 60, 90], ["90 days or more", 90, Infinity]];
  const ageOf = (c: Car) => Math.max(0, Math.floor((input.now - Date.parse(`${c.listedAt}T00:00:00Z`)) / DAY));
  const forSale = input.cars.filter((c) => !isSold(c) && c.listedAt);
  const stockAge = BANDS.map(([band, from, to]) => {
    const cars = forSale.filter((c) => ageOf(c) >= from && ageOf(c) < to);
    return { band, cars: cars.length, value: cars.reduce((s, c) => s + c.priceEur, 0) };
  });

  // Prep spent in the period, by kind, largest first.
  const start = Date.parse(`${months[0]}-01T00:00:00Z`);
  const lines = input.prep.flatMap((p) => p.lines).filter((l) => l.at >= start);
  const prep = [...new Set(lines.map((l) => l.kind))]
    .map((kind) => ({ kind, eur: lines.filter((l) => l.kind === kind).reduce((s, l) => s + l.eur, 0), lines: lines.filter((l) => l.kind === kind).length }))
    .sort((a, b) => b.eur - a.eur);

  return {
    months: months.map((month) => ({ month, ...sum(sales.filter((s) => s.soldOn.startsWith(month))) })),
    totals: { ...sum(sales), avgDaysToSell: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null },
    returns: { count: undone.length, refundEur: undone.reduce((t, s) => t + (s.refundEur ?? 0), 0) },
    people,
    sources,
    lost: [...leads.filter((l) => l.status === "lost").reduce((m, l) => m.set(l.lostReason ?? "Not said", (m.get(l.lostReason ?? "Not said") ?? 0) + 1), new Map<string, number>())].map(([reason, n]) => ({ reason, leads: n })).sort((a, b) => b.leads - a.leads),
    stockAge,
    prep,
  };
}

// A salesperson's own report: counts only, never money, and nobody else's figures (owner's decision, 2026-11-11).
export type PersonalMonth = { month: string; sold: number; leads: number; won: number };
export type PersonalReport = { months: PersonalMonth[]; totals: { sold: number; leads: number; won: number; winRate: number; followUpsDue: number } };
export function personalReport(input: { name: string; sales: Sale[]; leads: Lead[]; period: Period; now: number }): PersonalReport {
  const today = dublinDay(input.now);
  const months = monthsOf(input.period, today);
  const inPeriod = new Set(months);
  const sales = input.sales.filter((s) => !s.returnedOn && s.salesperson === input.name && inPeriod.has(s.soldOn.slice(0, 7)));
  const mine = input.leads.filter((l) => l.assignedTo === input.name);
  const leads = mine.filter((l) => inPeriod.has(leadMonth(l)));
  const won = leads.filter((l) => l.status === "won").length;
  return {
    months: months.map((month) => ({
      month,
      sold: sales.filter((s) => s.soldOn.startsWith(month)).length,
      leads: leads.filter((l) => leadMonth(l) === month).length,
      won: leads.filter((l) => leadMonth(l) === month && l.status === "won").length,
    })),
    totals: { sold: sales.length, leads: leads.length, won, winRate: rate(won, leads.length), followUpsDue: mine.filter((l) => followUpDue(l, today)).length },
  };
}
