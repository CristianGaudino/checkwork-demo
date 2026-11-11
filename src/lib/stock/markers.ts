import { isSold, type Car } from "./types";

// A marker is for the rare car, so it catches the eye; a car without one must never look worse for it. Facts from the car's own data
// only, never a price judgement. Used cars for sale only. Thresholds: an Irish car covers about 17,000 km a year, so a quarter of that
// over three years or more is unusual; one owner from new is common on a young car and rare on one ten years old.
export const RARE_LOW_KM_PER_YEAR = 5000;
export const RARE_LOW_KM_MIN_AGE = 3;
export const RARE_ONE_OWNER_MIN_AGE = 10;

export function rareMarker(car: Pick<Car, "condition" | "year" | "mileageKm" | "owners" | "soldAt">, now = new Date()): string | undefined {
  if ((car.condition ?? "used") !== "used" || isSold(car)) return undefined;
  const age = now.getUTCFullYear() - car.year;
  if (car.mileageKm !== undefined && age >= RARE_LOW_KM_MIN_AGE && car.mileageKm / age < RARE_LOW_KM_PER_YEAR) return "Very low mileage";
  if (car.owners === 1 && age >= RARE_ONE_OWNER_MIN_AGE) return "One owner from new";
  return undefined;
}
