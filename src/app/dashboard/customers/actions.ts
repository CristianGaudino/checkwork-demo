"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/admin/activity";
import { alertsStore, subscribersStore } from "@/lib/admin/collections";
import { requireStaff } from "@/lib/staff";

// Consent only goes one way here: staff can stop an alert or the newsletter (the person asked, by phone or in person), never start one
// again. Only the person can sign up again, on the website. Restarting it for them would send marketing they did not agree to.

export async function pauseAlertAction(id: string) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  const a = await alertsStore.get(id);
  if (!a?.active) return;
  await alertsStore.put({ ...a, active: false });
  await logActivity("customers", "Paused the stock alert", { kind: "alert", id });
  revalidatePath("/dashboard/customers");
}

export async function removeAlertAction(id: string) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  if (!(await alertsStore.get(id))) return;
  await alertsStore.remove(id);
  await logActivity("customers", "Removed a stock alert", { kind: "alert", id });
  revalidatePath("/dashboard/customers");
}

export async function unsubscribeAction(id: string) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  const s = await subscribersStore.get(id);
  if (s?.status !== "subscribed") return;
  await subscribersStore.put({ ...s, status: "unsubscribed" });
  await logActivity("customers", "Unsubscribed from the newsletter", { kind: "subscriber", id });
  revalidatePath("/dashboard/customers");
}
