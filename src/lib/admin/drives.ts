import { DRIVE_STATUSES, type DriveStatus, type TestDrive } from "./collections";
import { HOUR } from "@/lib/time";
import { TEST_DRIVE, driveTimes } from "@/lib/leads/constants";
import { addDays, addMonths, dublinDateTime, dublinDay } from "./format";

// Agenda helpers for the test drive bookings. Pure, so the grouping and the checks are tested. How far ahead, and on which days and
// times, is TEST_DRIVE and driveTimes (src/lib/leads/constants.ts), shared with the website's booking form.

export type DriveGroup = { day: string; drives: TestDrive[] };

// Bookings grouped by day, days in order, and within a day by time.
export function groupByDay(drives: TestDrive[]): DriveGroup[] {
  const map = new Map<string, TestDrive[]>();
  // In the order given: the page sorts soonest first for what is coming up and latest first for what is past.
  for (const d of drives) map.set(dublinDay(d.startsAt), [...(map.get(dublinDay(d.startsAt)) ?? []), d]);
  return [...map].map(([day, list]) => ({ day, drives: list }));
}

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

export const parseDriveStatus = (v: unknown): DriveStatus | undefined => (DRIVE_STATUSES as readonly unknown[]).includes(v) ? (v as DriveStatus) : undefined;
