"use server";

import { drivesStore, getSettings } from "@/lib/admin/collections";
import { slotData } from "@/lib/admin/drives";
import { slotState } from "@/lib/admin/slots";
import { driveDays, driveTimes } from "@/lib/leads/constants";
import { stock } from "@/lib/stock";

// The times a car is already out ("2026-11-14 10:00"), so the website's booking form offers only the free ones, by the dashboard's own
// slot rule (slotData, slotState: the picker staff book with). Input from anyone: an id, checked against stock. Only times go back, never who booked them.
export async function takenDriveTimes(carId: unknown): Promise<string[]> {
  if (typeof carId !== "string" || carId.length > 64) return [];
  try {
    const car = await stock.getById(carId);
    if (!car) return [];
    const [drives, { driveSlotMinutes }] = await Promise.all([drivesStore.list(), getSettings()]);
    const { taken, now } = slotData(drives.filter((d) => d.carSlug === car.slug));
    const out = taken[car.slug] ?? [];
    if (!out.length) return [];
    return driveDays().flatMap((day) => driveTimes(day).filter((t) => slotState(day, t, out, driveSlotMinutes, now) === "taken").map((t) => `${day} ${t}`));
  } catch {
    return []; // the form still works; a clash is then marked on the booking (mirrorLead)
  }
}
