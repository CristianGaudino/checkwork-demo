import { VISIT_EVENTS } from "@/lib/visit-rules";

// The anonymous feature counters (#174): a fixed list of event names, so the endpoint can never be made to store anything else. No
// cookie, no id, no IP is kept: a count goes up by one for a day and an event.
export const FILTER_NAMES = ["make", "model", "body", "fuel", "price", "year", "km", "gearbox"] as const;
export const BUYER_EVENTS = ["saved", "compare", "finance", "units", "no-results", "contact-topic", ...FILTER_NAMES.map((f) => `filter:${f}`), ...VISIT_EVENTS] as readonly string[];

// What the public endpoint takes: the buyer's events only.
export const isCountEvent = (e: unknown): e is string => typeof e === "string" && BUYER_EVENTS.includes(e);
export const countId = (day: string, event: string) => `${day}:${event}`;
export type DayCount = { id: string; day: string; event: string; count: number };
