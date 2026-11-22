"use server";

import { headers } from "next/headers";
import { takenDriveTimesFromDash } from "@/lib/leads/dash";
import { getBindings } from "@/lib/leads/bindings";
import { stock } from "@/lib/stock";

// The test drive picker's one question: which slot starts ("YYYY-MM-DD HH:MM") are already booked for this car. Input from anyone: digits only,
// a car in this site's stock (so a made-up id costs the dashboard nothing), and a limit per visitor (their address only keys it, never stored).
// The dashboard decides; on any problem the answer is [], so the form still works and the server checks the booking again.
export async function takenDriveTimes(carId: unknown): Promise<string[]> {
  if (typeof carId !== "string" || !/^\d{1,12}$/.test(carId)) return [];
  const limiter = getBindings().DRIVE_LIMITER; // none in next dev and the E2E run: nothing is limited
  if (limiter && !(await limiter.limit({ key: `drive:${(await headers()).get("cf-connecting-ip") ?? "unknown"}` })).success) return [];
  if (!(await stock.getById(carId))) return [];
  return takenDriveTimesFromDash(carId);
}
