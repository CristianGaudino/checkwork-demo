"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activity";
import { notify } from "@/lib/admin/notifications";
import { currentMember } from "@/lib/permissions";
import { DRIVE_STATUS_LABELS, drivesStore, getSettings } from "@/lib/admin/collections";
import { DRIVE_LIMITS, clashes, parseDriveStatus } from "@/lib/admin/drives";
import { adminCars } from "@/lib/admin/stock-admin";
import { carName } from "@/lib/stock/format";
import { HOUR, MINUTE } from "@/lib/time";
import { EMAIL_INVALID, NAME_REQUIRED } from "@/lib/copy";
import { newId } from "@/lib/admin/ids";
import { fieldErrors, isoDay } from "@/lib/admin/validation";
import { addMonths, dublinDay, dublinMs } from "@/lib/admin/format";
import { isBankHoliday } from "@/lib/bank-holidays";
import { LIMITS, TEST_DRIVE, driveTimes, inDriveHours } from "@/lib/leads/constants";

// `day`: the booked day, so the page can open the diary on it.
export type DriveFormState = { errors?: Record<string, string>; done?: string; day?: string } | undefined;

export async function setDriveStatusAction(id: string, status: string) {
  const next = parseDriveStatus(status);
  const drive = await drivesStore.get(id);
  if (!next || !drive || drive.status === next) return;
  await drivesStore.put({ ...drive, status: next });
  await logActivity("test-drives", `Changed the test drive from ${DRIVE_STATUS_LABELS[drive.status]} to ${DRIVE_STATUS_LABELS[next]}`, { kind: "drive", id });
  revalidatePath("/dashboard/test-drives");
}

// Who takes the customer out: a team member's name, or "" for nobody yet. Anything else is refused.
export async function assignDriveAction(id: string, name: string) {
  const drive = await drivesStore.get(id);
  const { team } = await getSettings();
  if (!drive || (name && !team.some((t) => t.name === name)) || (drive.assignedTo ?? "") === name) return;
  await drivesStore.put({ ...drive, assignedTo: name || undefined });
  await logActivity("test-drives", name ? `Gave the test drive to ${name}` : "Took the test drive off its person", { kind: "drive", id });
  const me = await currentMember();
  if (name && name !== me.name) await notify({ kind: "assigned", for: name, text: `${me.name} gave you a test drive: ${drive.carTitle}`, href: `/dashboard/test-drives/${id}` });
  revalidatePath("/dashboard/test-drives");
}

const booking = z.object({
  name: z.string().trim().min(1, NAME_REQUIRED).max(DRIVE_LIMITS.name),
  phone: z.string().trim().min(6, "Enter a phone number").max(DRIVE_LIMITS.phone),
  email: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().email(EMAIL_INVALID).max(LIMITS.email).optional()),
  carSlug: z.string().min(1, "Choose a car"),
  date: isoDay("Choose a day"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a time"),
  notes: z.string().trim().max(DRIVE_LIMITS.notes).optional(),
  assignedTo: z.string().max(DRIVE_LIMITS.name).optional(),
});

// The rules for a booking's time, for a new one and a moved one (`ignoreId`: the booking being moved does not clash with itself).
async function checkSlot(carSlug: string, carTitle: string, date: string, time: string, ignoreId?: string): Promise<{ startsAt: number } | { errors: Record<string, string> }> {
  const startsAt = dublinMs(date, time); // typed in Irish time, like the visitors' bookings
  if (Number.isNaN(startsAt)) return { errors: { date: "Choose a day" } };
  // An hour of grace, so "now" on the form is not refused. A typo for last year is.
  if (startsAt < Date.now() - HOUR) return { errors: { date: "Choose a day that has not passed" } };
  // The website's rules (TEST_DRIVE, driveTimes): up to two months ahead (a typo for next year is refused), only on a day we are open,
  // never a bank holiday, and inside the driving hours. Today is allowed here, for someone at the desk.
  if (date > addMonths(dublinDay(), TEST_DRIVE.monthsAhead)) return { errors: { date: "Choose a day in the next two months" } };
  if (isBankHoliday(date)) return { errors: { date: "That's a bank holiday. We're closed" } };
  if (!driveTimes(date).length) return { errors: { date: "We're closed that day" } };
  if (!inDriveHours(date, time)) return { errors: { time: `Choose a time from ${driveTimes(date)[0]} to ${driveTimes(date).at(-1)}` } };
  const clash = clashes(await drivesStore.list(), carSlug, startsAt, ignoreId, (await getSettings()).driveSlotMinutes * MINUTE);
  if (clash.length) return { errors: { time: `${carTitle} is already booked around then` } };
  return { startsAt };
}

// A booking moved to another time, by the same rules. Only one still to happen (requested or confirmed).
const moving = z.object({ date: booking.shape.date, time: booking.shape.time });
export async function moveDriveAction(id: string, _prev: DriveFormState, data: FormData): Promise<DriveFormState> {
  const drive = await drivesStore.get(id);
  if (!drive || (drive.status !== "requested" && drive.status !== "confirmed")) return { errors: { date: "This booking can no longer be moved" } };
  const parsed = moving.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const slot = await checkSlot(drive.carSlug, drive.carTitle, parsed.data.date, parsed.data.time, id);
  if ("errors" in slot) return slot;
  await drivesStore.put({ ...drive, startsAt: slot.startsAt });
  await logActivity("test-drives", "Moved the test drive to another time", { kind: "drive", id });
  revalidatePath("/dashboard/test-drives");
  return { done: "Moved." };
}

// A booking the dealer takes by phone or in person. It refuses a time when the same car is already out within the hour.
export async function addDriveAction(_prev: DriveFormState, data: FormData): Promise<DriveFormState> {
  const parsed = booking.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const b = parsed.data;
  const car = (await adminCars()).find((c) => c.slug === b.carSlug);
  if (!car) return { errors: { carSlug: "That car is not in stock" } };
  const slot = await checkSlot(car.slug, carName(car), b.date, b.time);
  if ("errors" in slot) return slot;
  const startsAt = slot.startsAt;
  const id = newId("drive");
  const who = b.assignedTo && (await getSettings()).team.some((t) => t.name === b.assignedTo) ? b.assignedTo : undefined;
  await drivesStore.put({ id, name: b.name, phone: b.phone, email: b.email ?? "", carSlug: car.slug, carTitle: carName(car), startsAt, status: "confirmed", notes: b.notes ?? "", ...(who && { assignedTo: who }), createdAt: Date.now() });
  await logActivity("test-drives", "Booked a test drive", { kind: "drive", id });
  revalidatePath("/dashboard/test-drives");
  return { done: `Booked ${b.name} for ${carName(car)}.`, day: b.date };
}
