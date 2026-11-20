import type { TestDrive } from "./collections";
import { HOUR } from "@/lib/time";
import { TEST_DRIVE, driveTimes } from "@/lib/leads/constants";
import { addDays, addMonths, dublinDateTime, dublinDay, dublinMs } from "./format";

// A seeded booking whose time has passed: a confirmed one went ahead, a request moves to the same time the next day. So the demo, opened
// at any hour, never shows a drive that already happened still waiting to be confirmed.
export function settleSeededDrive(startsAt: number, status: DriveStatus, now: number): { startsAt: number; status: DriveStatus } {
  if (startsAt > now || !isOpenDrive({ status })) return { startsAt, status };
  if (status === "confirmed") return { startsAt, status: "completed" };
  return { startsAt: seededSlot(addDays(dublinDay(startsAt), 1), dublinDateTime(startsAt).slice(11)), status };
}

// A seeded booking inside opening hours: a closed day (a Sunday, a bank holiday) moves to the next open one (`step` -1: the one before, so
// a past booking stays past), and a time outside the day's slots moves to the nearest one (17:30 on a Saturday becomes 15:00).
export function seededSlot(day: string, time: string, step: 1 | -1 = 1): number {
  while (!driveTimes(day).length) day = addDays(day, step);
  const t = driveTimes(day);
  return dublinMs(day, t.find((x) => x >= time) ?? t.at(-1)!);
}

// Agenda helpers for the test drive bookings. Pure, so the grouping and the checks are tested. How far ahead, and on which days and
// times, is TEST_DRIVE and driveTimes (src/lib/leads/constants.ts), shared with the website's booking form.

export const DRIVE_STATUSES = ["requested", "confirmed", "completed", "no-show", "cancelled"] as const;
export type DriveStatus = (typeof DRIVE_STATUSES)[number];
export const DRIVE_STATUS_LABELS: Record<DriveStatus, string> = { requested: "Requested", confirmed: "Confirmed", completed: "Completed", "no-show": "No show", cancelled: "Cancelled" };

// The desk booking's limits: the form shows them and the server checks the same numbers.
export const DRIVE_LIMITS = { name: 80, phone: 30, notes: 300 } as const;

// Two bookings for the same car within the slot (an hour by default) of each other clash: one car cannot be out twice.
export function clashes(drives: TestDrive[], carSlug: string, startsAt: number, ignoreId?: string, windowMs = HOUR): TestDrive[] {
  return drives.filter((d) => d.id !== ignoreId && d.carSlug === carSlug && isOpenDrive(d) && Math.abs(d.startsAt - startsAt) < windowMs);
}

export const isOpenDrive = (d: Pick<TestDrive, "status">) => d.status === "requested" || d.status === "confirmed";

// What the dashboard's slot picker needs: the open days from today (the desk can book today, the website from tomorrow) to TEST_DRIVE's
// limit, each car's open bookings in Irish time (but `ignoreId`, the booking being moved), and now. Pure, so it is tested.
export function slotData(drives: TestDrive[], ignoreId?: string, now = Date.now()) {
  const today = dublinDay(now);
  const last = addMonths(today, TEST_DRIVE.monthsAhead);
  const days: string[] = [];
  for (let d = today; d <= last; d = addDays(d, 1)) if (driveTimes(d).length > 0) days.push(d);
  const taken: Record<string, string[]> = {};
  for (const d of drives) if (d.id !== ignoreId && isOpenDrive(d) && d.startsAt > now - HOUR) (taken[d.carSlug] ??= []).push(dublinDateTime(d.startsAt));
  return { days, taken, now: dublinDateTime(now) };
}

// What the dealer can do next from each status. Anything else is not offered (and a booking that is over has nothing).
export const DRIVE_NEXT: Partial<Record<DriveStatus, [DriveStatus, string][]>> = {
  requested: [["confirmed", "Confirm"], ["cancelled", "Cancel"]],
  confirmed: [["completed", "Mark done"], ["no-show", "No show"], ["cancelled", "Cancel"]],
};

// The requests still to confirm that have not happened yet, soonest first: Today's "Waiting to be confirmed".
export const waitingDrives = (drives: TestDrive[], now = Date.now()) => drives.filter((d) => d.status === "requested" && d.startsAt > now).sort((a, b) => a.startsAt - b.startsAt);

// The List view: a search on name, phone, email or car, then the status, who has it ("none" for nobody), whether it is still to come, and
// (car=gone) an open booking on a car no longer for sale, from `gone`, the slugs of those cars.
export type DriveFilter = { q?: string; status?: string; with?: string; when?: string; car?: string };
export function filterDrives(drives: TestDrive[], f: DriveFilter, now = Date.now(), gone: Set<string> = new Set()): TestDrive[] {
  const q = (f.q ?? "").trim().toLowerCase().slice(0, 60);
  return drives.filter(
    (d) =>
      (!q || [d.name, d.phone, d.email, d.carTitle].some((x) => x.toLowerCase().includes(q))) &&
      (!f.status || d.status === f.status) &&
      (!f.with || (f.with === "none" ? !d.assignedTo : d.assignedTo === f.with)) &&
      (!f.when || (f.when === "past" ? d.startsAt < now : d.startsAt >= now)) &&
      (f.car !== "gone" || (isOpenDrive(d) && gone.has(d.carSlug))),
  );
}

export const parseDriveStatus = (v: unknown): DriveStatus | undefined => (DRIVE_STATUSES as readonly unknown[]).includes(v) ? (v as DriveStatus) : undefined;
