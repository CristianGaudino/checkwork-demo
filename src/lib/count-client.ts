import { bandOf, channelOf, isChannel, type Channel } from "@/lib/visit-rules";

// Tells the site a feature was used (src/app/api/count/route.ts): an anonymous count, no cookie, nothing about the visitor. At most once
// per event per page load, so a buyer playing with a filter counts once. Never throws and never waits.
const sent = new Set<string>();
export function count(event: string) {
  if (typeof navigator === "undefined" || sent.has(event)) return;
  sent.add(event);
  try {
    navigator.sendBeacon("/api/count", new Blob([JSON.stringify({ event })], { type: "application/json" }));
  } catch {
    // counting is best effort
  }
}

// Counts each filter a buyer sets, by its name (never its value), and the price band they set. Taking one off is not a use.
const FILTER_KEYS: Record<string, string> = { make: "make", model: "model", body: "body", fuel: "fuel", gearbox: "gearbox", yearFrom: "year", yearTo: "year", priceMin: "price", priceMax: "price", kmMax: "km" };
export function countFilters<Q extends { priceMin?: number; priceMax?: number }>(before: Q, after: Q) {
  for (const [key, name] of Object.entries(FILTER_KEYS)) {
    const v = (after as Record<string, unknown>)[key];
    if (JSON.stringify(v) !== JSON.stringify((before as Record<string, unknown>)[key]) && v !== undefined && !(Array.isArray(v) && !v.length)) count(`filter:${name}`);
  }
  const band = bandOf(after);
  if (band && band !== bandOf(before)) count(`band:${band}`);
}

// The channel this visit came from, worked out on its first page and kept for the visit only (sessionStorage: the tab, until it closes).
// Just the channel's name, never the page or a visitor id. A lead form sends it, so the dealer sees which channel brings enquiries.
const KEY = "visit-channel";
export function visitChannel(): Channel | undefined {
  try {
    const v = sessionStorage.getItem(KEY);
    return isChannel(v) ? v : undefined;
  } catch {
    return undefined;
  }
}
export function startVisit() {
  if (visitChannel()) return; // already counted this visit
  const channel = channelOf(location.href, document.referrer);
  if (!channel) return; // a new tab of a visit already counted
  try {
    sessionStorage.setItem(KEY, channel);
  } catch {
    return; // storage blocked: the visit is not counted, rather than counted on every page
  }
  count(`visit:${channel}`);
}
