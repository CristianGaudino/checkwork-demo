"use server";

import { revalidatePath } from "next/cache";
import { alertsStore, subscribersStore } from "@/lib/admin/collections";

export async function toggleAlertAction(id: string) {
  const a = await alertsStore.get(id);
  if (!a) return;
  await alertsStore.put({ ...a, active: !a.active });
  revalidatePath("/dashboard/customers");
}

export async function removeAlertAction(id: string) {
  await alertsStore.remove(id);
  revalidatePath("/dashboard/customers");
}

export async function toggleSubscriberAction(id: string) {
  const s = await subscribersStore.get(id);
  if (!s) return;
  await subscribersStore.put({ ...s, status: s.status === "subscribed" ? "unsubscribed" : "subscribed" });
  revalidatePath("/dashboard/customers");
}
