"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { drivesStore, getSettings } from "@/lib/admin/collections";
import { clashes, parseDriveStatus } from "@/lib/admin/drives";
import { adminCars } from "@/lib/admin/stock-admin";
import { carName } from "@/lib/stock/format";
import { HOUR, MINUTE } from "@/lib/time";
import { EMAIL_INVALID, NAME_REQUIRED } from "@/lib/copy";
import { newId } from "@/lib/admin/ids";
import { fieldErrors } from "@/lib/admin/validation";

export type DriveFormState = { errors?: Record<string, string>; done?: string } | undefined;

export async function setDriveStatusAction(id: string, status: string) {
  const next = parseDriveStatus(status);
  const drive = await drivesStore.get(id);
  if (!next || !drive) return;
  await drivesStore.put({ ...drive, status: next });
  revalidatePath("/dashboard/test-drives");
}

const booking = z.object({
  name: z.string().trim().min(1, NAME_REQUIRED).max(80),
  phone: z.string().trim().min(6, "Enter a phone number").max(30),
  email: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().email(EMAIL_INVALID).max(120).optional()),
  carSlug: z.string().min(1, "Choose a car"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a day"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a time"),
  notes: z.string().trim().max(300).optional(),
});

// A booking the dealer takes by phone or in person. It refuses a time when the same car is already out within the hour.
export async function addDriveAction(_prev: DriveFormState, data: FormData): Promise<DriveFormState> {
  const parsed = booking.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const b = parsed.data;
  const car = (await adminCars()).find((c) => c.slug === b.carSlug);
  if (!car) return { errors: { carSlug: "That car is not in stock" } };
  const startsAt = new Date(`${b.date}T${b.time}:00`).getTime();
  if (Number.isNaN(startsAt)) return { errors: { date: "Choose a day" } };
  // An hour of grace, so "now" on the form is not refused. A typo for last year is.
  if (startsAt < Date.now() - HOUR) return { errors: { date: "Choose a day that has not passed" } };
  const clash = clashes(await drivesStore.list(), car.slug, startsAt, undefined, (await getSettings()).driveSlotMinutes * MINUTE);
  if (clash.length) return { errors: { time: `${carName(car)} is already booked around then` } };
  await drivesStore.put({ id: newId("drive"), name: b.name, phone: b.phone, email: b.email ?? "", carSlug: car.slug, carTitle: carName(car), startsAt, status: "confirmed", notes: b.notes ?? "", createdAt: Date.now() });
  revalidatePath("/dashboard/test-drives");
  return { done: `Booked ${b.name} for ${carName(car)}.` };
}
