import { DRIVE_STATUSES, type DriveStatus, type TestDrive } from "./collections";

// Agenda helpers for the test drive bookings. Pure, so the grouping and the checks are tested.
export type DriveGroup = { day: string; drives: TestDrive[] };

const dayKey = (t: number) => new Date(t).toLocaleDateString("en-CA"); // 2026-11-10, in the viewer's day

// Bookings grouped by day, days in order, and within a day by time.
export function groupByDay(drives: TestDrive[]): DriveGroup[] {
  const map = new Map<string, TestDrive[]>();
  for (const d of [...drives].sort((a, b) => a.startsAt - b.startsAt)) map.set(dayKey(d.startsAt), [...(map.get(dayKey(d.startsAt)) ?? []), d]);
  return [...map].map(([day, list]) => ({ day, drives: list }));
}

// Two bookings for the same car within the slot (an hour by default) of each other clash: one car cannot be out twice.
export function clashes(drives: TestDrive[], carSlug: string, startsAt: number, ignoreId?: string, windowMs = 3_600_000): TestDrive[] {
  return drives.filter((d) => d.id !== ignoreId && d.carSlug === carSlug && (d.status === "requested" || d.status === "confirmed") && Math.abs(d.startsAt - startsAt) < windowMs);
}

export const parseDriveStatus = (v: unknown): DriveStatus | undefined => (DRIVE_STATUSES as readonly unknown[]).includes(v) ? (v as DriveStatus) : undefined;
