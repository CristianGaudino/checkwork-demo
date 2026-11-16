import { DEALER_NAV } from "@/lib/admin/nav";

// The anonymous feature counters (#174): a fixed list of event names, so the endpoint can never be made to store anything else. No
// cookie, no id, no IP is kept: a count goes up by one for a day and an event.
export const FILTER_NAMES = ["make", "model", "body", "fuel", "price", "year", "km", "gearbox"] as const;
export const BUYER_EVENTS = ["saved", "compare", "finance", "units", "no-results", "contact-topic", ...FILTER_NAMES.map((f) => `filter:${f}`)] as readonly string[];
// A dashboard area is the first part of its path ("leads" for /dashboard/leads/abc); the home page is "overview".
export const DASH_AREAS = [...new Set(DEALER_NAV.map((i) => i.href.split("/")[2] ?? "overview"))];
export const DASH_EVENTS = DASH_AREAS.map((a) => `dash:${a}`);

// What the public endpoint takes: the buyer's events only. Dashboard opens are counted by a server action behind Access, so nobody outside
// can raise them.
export const isCountEvent = (e: unknown): e is string => typeof e === "string" && BUYER_EVENTS.includes(e);
export const isDashArea = (a: unknown): a is string => typeof a === "string" && DASH_AREAS.includes(a);
export const countId = (day: string, event: string) => `${day}:${event}`;
export type DayCount = { id: string; day: string; event: string; count: number };
