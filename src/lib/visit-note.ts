import type { Journey, JourneySearch } from "@/lib/leads/journey";
import { SITE_SLUG } from "@/lib/site";
import { CONDITIONS, FUELS, GEARBOXES, type StockQuery } from "@/lib/stock/types";
import { PRICE_BANDS, bandOf } from "@/lib/visit-rules";

// What this visit looked at (#249), kept in this tab only (sessionStorage) and gone when it closes: never a cookie, never localStorage, no
// id. Fixed values only: car ids, the filters' own slugs and lists, whole numbers. Nothing typed, no URL. It leaves the tab only with an
// enquiry the buyer chose to share it with (ShareVisit), as the site API's `journey` (src/lib/leads/journey.ts checks it on the server).
export const JOURNEY_CAPS = { cars: 12, views: 99, searches: 8, minutes: 240, monthlyEur: 5000, count: 99, bytes: 4096 } as const;
export const SLUG = /^[a-z0-9-]{1,40}$/;
export const CAR_ID = /^\d{1,12}$/;
export const NOTE_KEY = `${SITE_SLUG}:visit-note`;
export const NOTE_EVENT = "visit-note"; // fired on this window after each write, so an open form shows the latest

type Note = { start: number } & Omit<Journey, "v" | "minutes">;
type Count = "saved" | "compared";

// Storage blocked, full or edited by hand: nothing is noted, and the page carries on.
function update(change: (n: Note) => void) {
  try {
    const n: Note = JSON.parse(sessionStorage.getItem(NOTE_KEY) ?? "null") ?? { start: Date.now(), cars: [], searches: [], tools: {} };
    change(n);
    sessionStorage.setItem(NOTE_KEY, JSON.stringify(n));
    dispatchEvent(new Event(NOTE_EVENT));
  } catch {}
}

// The first page of the visit: when it started.
export const startNote = () => update(() => {});

// A car page opened. Most viewed first; a tie keeps the latest first, so past the cap the oldest least-viewed car drops off.
export const noteCar = (id: string) =>
  CAR_ID.test(id) &&
  update((n) => {
    const views = Math.min(JOURNEY_CAPS.views, (n.cars.find((c) => c.id === id)?.views ?? 0) + 1);
    n.cars = [{ id, views }, ...n.cars.filter((c) => c.id !== id)].sort((a, b) => b.views - a.views).slice(0, JOURNEY_CAPS.cars);
  });

const fixed = <T extends string>(v: string | undefined, ok: readonly T[] | RegExp): T | undefined =>
  v !== undefined && (ok instanceof RegExp ? ok.test(v) : ok.includes(v as T)) ? (v as T) : undefined;

// The filters of a stock list, as fixed values: the first of each kind picked, never the search box's text. A list with no filter is not a search.
export function searchOf(q: StockQuery): JourneySearch | null {
  const s = { make: fixed(q.make[0], SLUG), model: fixed(q.model[0], SLUG), body: fixed(q.body[0], SLUG), fuel: fixed(q.fuel[0], FUELS), gearbox: fixed(q.gearbox, GEARBOXES), priceBand: bandOf(q) ?? undefined };
  const set = Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined));
  return Object.keys(set).length ? ({ ...set, condition: fixed(q.condition ?? "used", CONDITIONS) } as JourneySearch) : null;
}
// Latest first, each search once (a new page or sort of the same search is not another one).
export function noteSearch(q: StockQuery) {
  const s = searchOf(q);
  if (!s) return;
  const same = JSON.stringify(s);
  update((n) => void (n.searches = [s, ...n.searches.filter((x) => JSON.stringify(x) !== same)].slice(0, JOURNEY_CAPS.searches)));
}

// The finance estimator was used; the last monthly figure it showed, to the euro.
export const noteFinance = (monthlyEur?: number) =>
  update((n) => {
    n.tools.finance = { ...n.tools.finance, ...(monthlyEur !== undefined && Number.isFinite(monthlyEur) && { monthlyEur: Math.max(0, Math.min(JOURNEY_CAPS.monthlyEur, Math.round(monthlyEur))) }) };
  });
export const noteTradeIn = () => update((n) => void (n.tools.tradeIn = true));
// How many cars are saved or compared now; the stores call it after every change, so undo, clear and the compare bar count too.
export const noteCount = (k: Count, n: number) =>
  update((t) => {
    const v = Math.max(0, Math.min(JOURNEY_CAPS.count, n));
    if (v) t.tools[k] = v;
    else delete t.tools[k];
  });

export function readNote(): string | null {
  try {
    return sessionStorage.getItem(NOTE_KEY);
  } catch {
    return null;
  }
}

// The server's journeySchema (src/lib/leads/journey.ts) by hand, so zod stays out of the page bundle (LeadForm loads it on first use).
// visit-note.test.ts checks the two agree. Strict: an unknown key fails, as it does there.
type Check = (v: unknown) => boolean;
const int = (min: number, max: number): Check => (v) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const oneOf = (ok: readonly string[] | RegExp): Check => (v) => typeof v === "string" && fixed(v, ok) !== undefined;
const list = (max: number, item: Check): Check => (v) => Array.isArray(v) && v.length <= max && v.every(item);
const obj =
  (req: Record<string, Check>, opt: Record<string, Check> = {}): Check =>
  (v) => {
    if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
    const o = v as Record<string, unknown>;
    return (
      Object.keys(o).every((k) => Object.hasOwn(req, k) || Object.hasOwn(opt, k)) &&
      Object.entries(req).every(([k, ok]) => ok(o[k])) &&
      Object.entries(opt).every(([k, ok]) => o[k] === undefined || ok(o[k]))
    );
  };
const isJourney = obj({
  v: (v) => v === 1,
  minutes: int(0, JOURNEY_CAPS.minutes),
  cars: list(JOURNEY_CAPS.cars, obj({ id: oneOf(CAR_ID), views: int(1, JOURNEY_CAPS.views) })),
  searches: list(
    JOURNEY_CAPS.searches,
    obj({}, { make: oneOf(SLUG), model: oneOf(SLUG), body: oneOf(SLUG), fuel: oneOf(FUELS), gearbox: oneOf(GEARBOXES), priceBand: oneOf(PRICE_BANDS), condition: oneOf(CONDITIONS) }),
  ),
  tools: obj({}, { finance: obj({}, { monthlyEur: int(0, JOURNEY_CAPS.monthlyEur) }), tradeIn: (v) => typeof v === "boolean", saved: int(0, JOURNEY_CAPS.count), compared: int(0, JOURNEY_CAPS.count) }),
}) as (v: unknown) => v is Journey;

// The note as the site API's `journey`, or null when there is nothing to share or the note is not one the server would take (edited by
// hand), so "What's shared" never lists what the server would drop.
export function journeyOf(raw: string | null, now = Date.now()): Journey | null {
  try {
    const n = JSON.parse(raw ?? "null") as Note;
    const j = { v: 1, minutes: Math.max(0, Math.min(JOURNEY_CAPS.minutes, Math.floor((now - n.start) / 60_000))), cars: n.cars, searches: n.searches, tools: n.tools };
    if (!isJourney(j) || (!j.cars.length && !j.searches.length && !Object.keys(j.tools).length)) return null;
    return new TextEncoder().encode(JSON.stringify(j)).length <= JOURNEY_CAPS.bytes ? j : null;
  } catch {
    return null;
  }
}

// What would be sent, in plain words, for the form's "What's shared".
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export function sharedLines(j: Journey): string[] {
  const { finance, tradeIn, saved, compared } = j.tools;
  return [
    j.cars.length && plural(j.cars.length, "car you looked at", "cars you looked at"),
    j.searches.length && plural(j.searches.length, "search", "searches"),
    finance && (finance.monthlyEur !== undefined ? `the finance calculator, at €${finance.monthlyEur.toLocaleString("en-IE")} a month` : "the finance calculator"),
    tradeIn && "that you started a valuation of your car",
    saved && plural(saved, "car you saved", "cars you saved"),
    compared && plural(compared, "car you compared", "cars you compared"),
    "how long you've been on the site",
  ].filter((l): l is string => typeof l === "string");
}
