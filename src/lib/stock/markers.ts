import { isSold, type Car } from "./types";

// A marker is for the rare car, so it catches the eye; a car without one must never look worse for it. Facts from the car's own data
// only, never a price judgement. Used cars for sale only. Thresholds: an Irish car covers about 17,000 km a year, so a quarter of that
// over three years or more is unusual; one owner is common on a young car and rare on one ten years old.
export const RARE_LOW_KM_PER_YEAR = 5000;
export const RARE_LOW_KM_MIN_AGE = 3;
export const RARE_ONE_OWNER_MIN_AGE = 10;

export function rareMarker(car: Pick<Car, "condition" | "year" | "mileageKm" | "owners" | "soldAt">, now = new Date()): string | undefined {
  if ((car.condition ?? "used") !== "used" || isSold(car)) return undefined;
  const age = now.getUTCFullYear() - car.year;
  // A car has a year, not a month: a 2023 car in January 2026 may be just over two years old. The rate uses the youngest it can be
  // (age - 1), so the marker only shows when it holds whatever month the car was registered.
  const youngest = age - 1;
  if (car.mileageKm !== undefined && youngest >= RARE_LOW_KM_MIN_AGE && car.mileageKm / youngest < RARE_LOW_KM_PER_YEAR) return "Very low mileage";
  if (car.owners === 1 && age >= RARE_ONE_OWNER_MIN_AGE) return "One owner";
  return undefined;
}
