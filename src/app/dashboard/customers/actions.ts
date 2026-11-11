"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/admin/activity";
import { alertsStore, subscribersStore } from "@/lib/admin/collections";

export async function toggleAlertAction(id: string) {
  const a = await alertsStore.get(id);
  if (!a) return;
  await alertsStore.put({ ...a, active: !a.active });
  await logActivity("customers", a.active ? "Paused the stock alert" : "Turned the stock alert back on", { kind: "alert", id });
  revalidatePath("/dashboard/customers");
}

export async function removeAlertAction(id: string) {
  if (!(await alertsStore.get(id))) return;
  await alertsStore.remove(id);
  await logActivity("customers", "Removed a stock alert", { kind: "alert", id });
  revalidatePath("/dashboard/customers");
}

export async function toggleSubscriberAction(id: string) {
  const s = await subscribersStore.get(id);
  if (!s) return;
  await subscribersStore.put({ ...s, status: s.status === "subscribed" ? "unsubscribed" : "subscribed" });
  await logActivity("customers", s.status === "subscribed" ? "Unsubscribed from the newsletter" : "Subscribed to the newsletter again", { kind: "subscriber", id });
  revalidatePath("/dashboard/customers");
}
