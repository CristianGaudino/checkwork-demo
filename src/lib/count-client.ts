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

// Counts each filter a buyer sets, by its name (never its value). Taking one off is not a use.
const FILTER_KEYS: Record<string, string> = { make: "make", model: "model", body: "body", fuel: "fuel", gearbox: "gearbox", yearFrom: "year", yearTo: "year", priceMin: "price", priceMax: "price", kmMax: "km" };
export function countFilters<Q extends object>(before: Q, after: Q) {
  for (const [key, name] of Object.entries(FILTER_KEYS)) {
    const v = (after as Record<string, unknown>)[key];
    if (JSON.stringify(v) !== JSON.stringify((before as Record<string, unknown>)[key]) && v !== undefined && !(Array.isArray(v) && !v.length)) count(`filter:${name}`);
  }
}
