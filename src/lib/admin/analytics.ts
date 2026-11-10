import { rng, DAY } from "./seed-data";

// The numbers on the Analytics page. Until real site analytics is connected (integrations.ts, "analytics"), they are generated here from a
// fixed seed: the same range always gives the same figures, and the figures agree with each other (the days add up to the totals, the
// sources add up to the visitors, each funnel step is no bigger than the one before). One function, so swapping in real data changes one place.
export type Car = { slug: string; title: string };
export type Day = { date: string; visitors: number; pageviews: number; leads: number };

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];
export const parseRange = (v: unknown): Range => (RANGES.includes(Number(v) as Range) ? (Number(v) as Range) : 30);

const SOURCES = [["Google search", 42, 1.0], ["Direct", 22, 1.2], ["Facebook", 15, 0.7], ["Instagram", 9, 0.6], ["Other sites", 8, 0.9], ["Email", 4, 1.8]] as const;
const PLACES = [["Dublin", 24], ["Cork", 14], ["Galway", 9], ["Limerick", 8], ["Kerry", 7], ["Waterford", 6], ["Kildare", 5], ["Meath", 5], ["Other Irish counties", 17], ["Outside Ireland", 5]] as const;
const DEVICES = [["Phone", 68], ["Desktop", 27], ["Tablet", 5]] as const;

// Whole numbers that add up exactly to `total`, shared by weight (the largest remainder goes to the heaviest first).
export function share(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  [...raw.keys()].sort((a, b) => raw[b] - Math.floor(raw[b]) - (raw[a] - Math.floor(raw[a]))).forEach((i) => left-- > 0 && out[i]++);
  return out;
}

const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

function simulateDays(count: number, endMs: number, seed: number): Day[] {
  return Array.from({ length: count }, (_, i) => {
    const t = endMs - (count - 1 - i) * DAY;
    const r = rng(seed + Math.floor(t / DAY)); // the same calendar day always gets the same numbers
    const dow = new Date(t).getUTCDay();
    const weekend = dow === 0 || dow === 6 ? 0.75 : 1;
    const visitors = Math.round((95 + r.int(0, 70)) * weekend * (1 + (i / count) * 0.08));
    const pageviews = Math.round(visitors * (2.4 + r.next() * 1.4));
    const leads = Math.max(0, Math.round(visitors * (0.008 + r.next() * 0.014)));
    return { date: isoDay(t), visitors, pageviews, leads };
  });
}

const sum = (days: Day[], k: keyof Omit<Day, "date">) => days.reduce((s, d) => s + d[k], 0);
export const change = (now: number, before: number) => (before ? ((now - before) / before) * 100 : 0);

// `leadTimes` are the real times leads arrived (the Leads inbox). When given, each day's leads are counted from them, so this page and the
// inbox agree; visitors and the rest stay generated.
export function buildAnalytics(input: { range: Range; cars: Car[]; now?: number; seed?: number; leadTimes?: number[] }) {
  const { range } = input;
  const end = Math.floor((input.now ?? Date.now()) / DAY) * DAY;
  const seed = input.seed ?? 7;
  // One run covers this range and the one before it, so the comparison uses the same rules.
  const all = simulateDays(range * 2, end, seed);
  if (input.leadTimes) {
    const perDay = new Map<string, number>();
    for (const t of input.leadTimes) perDay.set(isoDay(t), (perDay.get(isoDay(t)) ?? 0) + 1);
    for (const d of all) d.leads = perDay.get(d.date) ?? 0;
  }
  const days = all.slice(range);
  const before = all.slice(0, range);
  const visitors = sum(days, "visitors");
  const leads = sum(days, "leads");
  const r = rng(seed + range);

  const sources = share(visitors, SOURCES.map((s) => s[1])).map((v, i) => ({ name: SOURCES[i][0], visitors: v, leads: 0 }));
  const leadWeights = SOURCES.map((s, i) => sources[i].visitors * s[2]);
  share(leads, leadWeights).forEach((l, i) => (sources[i].leads = l));

  const places = share(visitors, PLACES.map((p) => p[1])).map((v, i) => ({ name: PLACES[i][0], visitors: v }));
  const devices = share(visitors, DEVICES.map((d) => d[1])).map((v, i) => ({ name: DEVICES[i][0], visitors: v }));

  const carViews = input.cars.map((c) => ({ ...c, views: Math.round(visitors * (0.004 + r.next() * 0.03)) })).sort((a, b) => b.views - a.views).slice(0, 8);
  const topCars = carViews.map((c) => {
    const saves = Math.round(c.views * (0.06 + r.next() * 0.1));
    return { slug: c.slug, title: c.title, views: c.views, saves, leads: Math.min(Math.round(saves * (0.1 + r.next() * 0.25)), leads) };
  });

  // Each step is a share of the one before, and the lead step is the real total, so a funnel never grows going down.
  const viewedCar = Math.round(visitors * (0.5 + r.next() * 0.1));
  const engaged = Math.min(viewedCar, Math.round(viewedCar * (0.2 + r.next() * 0.08)));
  const funnel = [
    { label: "Visited the site", count: visitors },
    { label: "Looked at a car", count: viewedCar },
    { label: "Saved, compared or tried finance", count: engaged },
    { label: "Sent us a message", count: Math.min(leads, engaged) },
    { label: "Bought a car", count: Math.round(Math.min(leads, engaged) * (0.14 + r.next() * 0.08)) },
  ];

  return {
    days,
    totals: { visitors, pageviews: sum(days, "pageviews"), leads, conversion: visitors ? (leads / visitors) * 100 : 0 },
    previous: { visitors: sum(before, "visitors"), pageviews: sum(before, "pageviews"), leads: sum(before, "leads") },
    sources,
    places,
    devices,
    topCars,
    funnel,
  };
}
