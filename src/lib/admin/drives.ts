import type { TestDrive } from "./collections";
import { HOUR } from "@/lib/time";
import { TEST_DRIVE, driveTimes } from "@/lib/leads/constants";
import { addDays, addMonths, dublinDateTime, dublinDay } from "./format";

// Agenda helpers for the test drive bookings. Pure, so the grouping and the checks are tested. How far ahead, and on which days and
// times, is TEST_DRIVE and driveTimes (src/lib/leads/constants.ts), shared with the website's booking form.

export const DRIVE_STATUSES = ["requested", "confirmed", "completed", "no-show", "cancelled"] as const;
export type DriveStatus = (typeof DRIVE_STATUSES)[number];
export const DRIVE_STATUS_LABELS: Record<DriveStatus, string> = { requested: "Requested", confirmed: "Confirmed", completed: "Completed", "no-show": "No show", cancelled: "Cancelled" };

// The desk booking's limits: the form shows them and the server checks the same numbers.
export const DRIVE_LIMITS = { name: 80, phone: 30, notes: 300 } as const;

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

// What the dealer can do next from each status. Anything else is not offered (and a booking that is over has nothing).
export const DRIVE_NEXT: Partial<Record<DriveStatus, [DriveStatus, string][]>> = {
  requested: [["confirmed", "Confirm"], ["cancelled", "Cancel"]],
  confirmed: [["completed", "Mark done"], ["no-show", "No show"], ["cancelled", "Cancel"]],
};

// The requests still to confirm that have not happened yet, soonest first: Today's "Waiting to be confirmed".
export const waitingDrives = (drives: TestDrive[], now = Date.now()) => drives.filter((d) => d.status === "requested" && d.startsAt > now).sort((a, b) => a.startsAt - b.startsAt);

// The List view: a search on name, phone, email or car, then the status, who has it ("none" for nobody) and whether it is still to come.
export type DriveFilter = { q?: string; status?: string; with?: string; when?: string };
export function filterDrives(drives: TestDrive[], f: DriveFilter, now = Date.now()): TestDrive[] {
  const q = (f.q ?? "").trim().toLowerCase().slice(0, 60);
  return drives.filter(
    (d) =>
      (!q || [d.name, d.phone, d.email, d.carTitle].some((x) => x.toLowerCase().includes(q))) &&
      (!f.status || d.status === f.status) &&
      (!f.with || (f.with === "none" ? !d.assignedTo : d.assignedTo === f.with)) &&
      (!f.when || (f.when === "past" ? d.startsAt < now : d.startsAt >= now)),
  );
}

export const parseDriveStatus = (v: unknown): DriveStatus | undefined => (DRIVE_STATUSES as readonly unknown[]).includes(v) ? (v as DriveStatus) : undefined;
