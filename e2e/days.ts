import { driveTimes } from "../src/lib/leads/constants";

// A day the dealer is open, two to about eight weeks out (after the seeded bookings, inside the two months a desk booking allows), picked
// by `seed` so each run books a different day and a retry never meets the first try's booking.
export function openDay(seed: number): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
  const days = Array.from({ length: 40 }, (_, i) => new Date(Date.parse(`${today}T12:00:00Z`) + (14 + i) * 86_400_000).toISOString().slice(0, 10));
  const open = days.filter((d) => driveTimes(d).length > 0);
  return open[seed % open.length];
}
