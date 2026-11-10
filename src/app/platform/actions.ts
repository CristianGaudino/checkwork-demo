"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PLATFORM_COLLECTIONS, dealershipsStore, getPlatformSettings, invoicesStore, logAudit, platformSettingsStore, type Dealership } from "@/lib/admin/platform";
import { monthlyEur } from "@/lib/admin/platform-calc";
import { PLANS, addonOf, planOf } from "@/lib/plans";

// Keeps this month's invoice in step with the account: an active account has one for what it now pays, unless it is already paid.
// A trial or paused account is not invoiced. Earlier months are history and are never touched.
async function syncInvoice(d: Dealership) {
  if (d.status !== "active") return;
  const month = new Date().toISOString().slice(0, 7);
  const id = `inv-${d.id}-${month}`;
  const existing = await invoicesStore.get(id);
  if (existing?.status === "paid") return;
  await invoicesStore.put({ id, dealershipId: d.id, dealershipName: d.name, month, amountEur: monthlyEur(d), status: existing?.status ?? "due" });
}

const planIds = PLANS.map((p) => p.id) as [string, ...string[]];

const add = z.object({ name: z.string().trim().min(1, "Enter a name").max(80), town: z.string().trim().min(1, "Enter a town").max(60), owner: z.string().trim().min(1, "Enter the owner's name").max(60) });
export type AddState = { errors?: Record<string, string> } | undefined;

// A new dealership starts as a trial on the default plan. A name already on the platform is refused.
export async function addDealershipAction(_p: AddState, data: FormData): Promise<AddState> {
  const r = add.safeParse(Object.fromEntries(data));
  if (!r.success) {
    const errors: Record<string, string> = {};
    for (const i of r.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }
  if ((await dealershipsStore.list()).some((d) => d.name.toLowerCase() === r.data.name.toLowerCase())) return { errors: { name: "A dealership with that name is already on the platform" } };
  const s = await getPlatformSettings();
  const p = planOf(s.defaultPlan);
  const id = `d-${Date.now()}`;
  await dealershipsStore.put({ id, ...r.data, plan: p.id, status: "trial", addons: [], cars: 0, leadsMonth: 0, seats: 1, createdAt: Date.now() });
  await logAudit(`Started a ${s.trialDays} day trial on ${p.name}`, r.data.name);
  revalidatePath("/platform");
  redirect(`/platform/dealerships/${id}`);
}

export async function setPlanAction(id: string, data: FormData) {
  const plan = z.enum(planIds).safeParse(data.get("plan"));
  const d = await dealershipsStore.get(id);
  if (!plan.success || !d || d.plan === plan.data) return;
  const next = { ...d, plan: plan.data };
  await dealershipsStore.put(next);
  await syncInvoice(next);
  await logAudit(`Changed plan to ${planOf(plan.data).name}`, d.name);
  revalidatePath("/platform", "layout");
}

export async function toggleStatusAction(id: string) {
  const d = await dealershipsStore.get(id);
  if (!d) return;
  // A paused account resumes as active; anything else pauses.
  const next = d.status === "paused" ? "active" : "paused";
  const updated = { ...d, status: next } as Dealership;
  await dealershipsStore.put(updated);
  await syncInvoice(updated);
  await logAudit(next === "paused" ? "Paused the account" : "Resumed the account", d.name);
  revalidatePath("/platform", "layout");
}

export async function activateTrialAction(id: string) {
  const d = await dealershipsStore.get(id);
  if (!d || d.status !== "trial") return;
  const active = { ...d, status: "active" } as Dealership;
  await dealershipsStore.put(active);
  await syncInvoice(active);
  await logAudit("Ended the trial and started billing", d.name);
  revalidatePath("/platform", "layout");
}

export async function toggleAddonAction(id: string, addon: string) {
  const d = await dealershipsStore.get(id);
  const a = addonOf(addon);
  if (!d || !a) return;
  const on = d.addons.includes(a.id);
  const next = { ...d, addons: on ? d.addons.filter((x) => x !== a.id) : [...d.addons, a.id] };
  await dealershipsStore.put(next);
  await syncInvoice(next);
  await logAudit(`${on ? "Turned off" : "Turned on"} the ${a.name} add-on`, d.name);
  revalidatePath("/platform", "layout");
}

export async function markInvoicePaidAction(id: string) {
  const inv = await invoicesStore.get(id);
  if (!inv || inv.status === "paid") return;
  await invoicesStore.put({ ...inv, status: "paid" });
  await logAudit(`Marked the ${inv.month} invoice paid`, inv.dealershipName);
  revalidatePath("/platform/usage");
}

const settings = z.object({
  trialDays: z.coerce.number().int("Whole days").min(0, "At least 0").max(90, "At most 90"),
  defaultPlan: z.enum(planIds),
  supportEmail: z.string().trim().email("Enter a valid email").max(120),
});
export type SettingsState = { errors?: Record<string, string>; saved?: boolean } | undefined;
export async function savePlatformSettingsAction(_p: SettingsState, data: FormData): Promise<SettingsState> {
  const r = settings.safeParse(Object.fromEntries(data));
  if (!r.success) {
    const errors: Record<string, string> = {};
    for (const i of r.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }
  await platformSettingsStore.put({ id: "platform", ...r.data, updatedAt: Date.now() });
  await logAudit("Changed the platform settings", "Platform");
  revalidatePath("/platform", "layout");
  return { saved: true };
}

export async function resetPlatformAction() {
  for (const c of PLATFORM_COLLECTIONS) await c.reset();
  revalidatePath("/platform", "layout");
}
