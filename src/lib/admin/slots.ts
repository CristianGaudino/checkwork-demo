// Whether a test drive time can still be booked, as the dashboard's slot picker shows it. Plain strings in Irish time ("2026-11-12",
// "14:30"), no stores, so the picker (a client component) uses the same rule the server checks with (checkSlot). Pure, so it is tested.
import { driveTimes } from "@/lib/leads/constants";

const mins = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

// `taken`: the car's open bookings as "YYYY-MM-DD HH:MM". `now`: the same form, for today's times that have gone. A time within the slot
// (`windowMin`) of a booking for the same car is taken: one car cannot be out twice.
export function slotState(day: string, time: string, taken: string[], windowMin: number, now: string): "open" | "past" | "taken" {
  if (`${day} ${time}` <= now) return "past";
  const t = mins(time);
  return taken.some((s) => s.slice(0, 10) === day && Math.abs(mins(s.slice(11)) - t) < windowMin) ? "taken" : "open";
}

// The first of `days` after `after` with a time still open for the car, and that time: where the picker opens, and its "Next available"
// (#238). Undefined when nothing is free in the days offered.
export function firstOpen(days: string[], taken: string[], windowMin: number, now: string, after = "", timesOf = driveTimes): { date: string; time: string } | undefined {
  for (const date of days) {
    if (date <= after) continue;
    const time = timesOf(date).find((t) => slotState(date, t, taken, windowMin, now) === "open");
    if (time) return { date, time };
  }
}
