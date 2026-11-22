"use server";

import { takenDriveTimesFromDash } from "@/lib/leads/dash";

// The test drive picker's one question: which slot starts ("YYYY-MM-DD HH:MM") are already booked for this car. Input from anyone: digits only.
// The dashboard decides; on any problem the answer is [], so the form still works and the server checks the booking again.
export async function takenDriveTimes(carId: unknown): Promise<string[]> {
  if (typeof carId !== "string" || !/^\d{1,12}$/.test(carId)) return [];
  return takenDriveTimesFromDash(carId);
}
