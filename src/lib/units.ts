import { useSyncExternalStore } from "react";
import { SITE_SLUG } from "@/lib/site";
import { KM_PER_MILE, fmtNum, formatKm } from "@/lib/stock/format";

// How mileage is shown: km (the site's own unit) or miles, for buyers who think in miles. Only the view changes: the stock, filters
// and forms stay in km. Remembered in this browser; km until the buyer chooses.
export type Unit = "km" | "miles";
const KEY = `${SITE_SLUG}:unit`;
const listeners = new Set<() => void>();
const read = (): Unit => {
  try {
    return localStorage.getItem(KEY) === "miles" ? "miles" : "km";
  } catch {
    return "km";
  }
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const useUnit = () => useSyncExternalStore(subscribe, read, () => "km" as Unit);
export function setUnit(u: Unit) {
  try {
    if (u === "miles") localStorage.setItem(KEY, u);
    else localStorage.removeItem(KEY);
  } catch {
    // Private window or blocked storage: the choice lasts for this page view only.
  }
  listeners.forEach((l) => l());
}

// Miles are a conversion, so they read to the nearest hundred ("51,100 miles", not "51,139"); under 1,000 to the mile, so a new car is not "0 miles".
const toMiles = (km: number) => {
  const m = km / KM_PER_MILE;
  return m < 1000 ? Math.round(m) : Math.round(m / 100) * 100;
};
export const formatMileage = (km: number, unit: Unit) => (unit === "miles" ? `${fmtNum(toMiles(km))} miles` : formatKm(km));
