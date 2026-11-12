import "server-only";
import { resetSyncStatus } from "@/lib/donedeal/sync";
import { resetActivity } from "./activity";
import { DEALER_COLLECTIONS, reservationsStore } from "./collections";
import { noticesStore, readsStore } from "./notifications";
import { adminCars, saveCar } from "./stock-admin";

// The demo's made-up records back to their seed, dated from today: Settings, Reset demo data, and every Monday after the deploy moves the
// demo cars' sold dates (worker.mjs). What visitors sent (ids starting "real-") stays. The callers check that this is the demo.
export async function resetDemoRecords() {
  for (const c of [...DEALER_COLLECTIONS, noticesStore, readsStore]) await c.reset();
  // The deposits are back to the seed, so the Reserved marks follow them (the mark is on the car, which the reset keeps): on the cars with a
  // held deposit, off every other car.
  const held = new Set((await reservationsStore.list()).filter((r) => r.status === "held").map((r) => r.carId));
  for (const car of await adminCars()) if (Boolean(car.reserved) !== held.has(car.id)) await saveCar({ ...car, reserved: held.has(car.id) || undefined });
  await resetActivity();
  await resetSyncStatus();
}
