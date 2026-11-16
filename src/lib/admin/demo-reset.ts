import "server-only";
import { resetSyncStatus } from "@/lib/donedeal/sync";
import { resetActivity } from "./activity";
import { DEALER_COLLECTIONS, reservationsStore } from "./collections";
import { noticesStore, readsStore } from "./notifications";
import { sentAlertsStore, usageStore } from "@/lib/billing/usage";
import { billsStore } from "@/lib/billing/bills";
import { feedbackStore, helpStore } from "./help";
import { getBindings } from "@/lib/leads/bindings";
import { adminCars, saveCar } from "./stock-admin";
import { messagesStore, staffStore } from "@/lib/whatsapp/store";

// The demo's made-up records back to their seed, dated from today: Settings, Reset demo data, and every Monday after the deploy moves the
// demo cars' sold dates (worker.mjs). What visitors sent (ids starting "real-") stays. The callers check that this is the demo.
export async function resetDemoRecords() {
  // The usage, bills and Help records too, so the Billing page's month and bills are dated from today and a reached limit is lifted.
  for (const c of [...DEALER_COLLECTIONS, noticesStore, readsStore, usageStore, sentAlertsStore, billsStore, helpStore, feedbackStore, messagesStore, staffStore]) await c.reset();
  // The deposits are back to the seed, so the Reserved marks follow them (the mark is on the car, which the reset keeps): on the cars with a
  // held deposit, off every other car.
  const held = new Set((await reservationsStore.list()).filter((r) => r.status === "held").map((r) => r.carId));
  for (const car of await adminCars()) if (Boolean(car.reserved) !== held.has(car.id)) await saveCar({ ...car, reserved: held.has(car.id) || undefined });
  await resetActivity();
  await resetSyncStatus();
  // The media library's uploaded files in R2 go too, best effort: the library's records are already back to the seed.
  try {
    const bucket = getBindings().LEAD_PHOTOS;
    let cursor: string | undefined;
    if (bucket)
      do {
        const page = await bucket.list({ prefix: "media/", cursor });
        if (page.objects.length) await bucket.delete(page.objects.map((o) => o.key));
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
  } catch {}
}
