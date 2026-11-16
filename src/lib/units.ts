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

export const formatMileage = (km: number, unit: Unit) => (unit === "miles" ? `${fmtNum(Math.round(km / KM_PER_MILE))} miles` : formatKm(km));
