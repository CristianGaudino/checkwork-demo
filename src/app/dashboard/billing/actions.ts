"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activity";
import { SETTINGS_DEFAULT, settingsStore, type DealerSettings } from "@/lib/admin/collections";
import { enabledModules } from "@/lib/modules";
import { can, currentMember } from "@/lib/permissions";
import { fieldErrors } from "@/lib/admin/validation";
import { billingSettings, saveBilling, monthUsage } from "@/lib/billing/usage";
import { eur, parseAlert, parseLimits, billedServices } from "@/lib/billing/bills-rules";
import { AI_MODELS, KINDS, SERVICE_LABELS, type AiModel, type Scope } from "@/lib/billing/rules";
import { requireStaff } from "@/lib/staff";

export type BillingState = { errors?: Record<string, string>; saved?: boolean } | undefined;
const NO = "Only an owner or manager can change this";
const scopeLabel = (s: Scope) => (s === "total" ? "all usage" : SERVICE_LABELS[s]);
// What can have a limit or an alert: the services the Billing page lists, and all usage together.
const scopesOf = async (): Promise<Scope[]> => [...billedServices(await enabledModules(), await monthUsage()), "total"];
const done = (): BillingState => (revalidatePath("/dashboard/billing"), { saved: true });

export async function saveLimitsAction(_p: BillingState, data: FormData): Promise<BillingState> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  if (!(await can("billing"))) return { errors: { form: NO } };
  const [b, scopes] = [await billingSettings(), await scopesOf()];
  const { caps, errors } = parseLimits((k) => String(data.get(k) ?? ""), b.ceilings, scopes);
  if (Object.keys(errors).length) return { errors };
  const alertAt80 = data.get("alertAt80") === "on";
  const next = { ...b.caps };
  for (const s of scopes) delete next[s];
  Object.assign(next, caps);
  // The form shows a stored limit above our ceiling as the ceiling (BillingForms): saved untouched, the stored one stays.
  for (const s of scopes) if (b.caps[s] !== undefined && next[s] === Math.min(b.caps[s]!, b.ceilings[s] ?? Infinity)) next[s] = b.caps[s];
  for (const s of scopes) if (b.caps[s] !== next[s]) await logActivity("settings", next[s] === undefined ? `Removed the monthly limit on ${scopeLabel(s)}` : `Set the monthly limit on ${scopeLabel(s)} to ${eur(next[s]!)}`);
  if (b.alertAt80 !== alertAt80) await logActivity("settings", `Turned the 80% usage alert ${alertAt80 ? "on" : "off"}`);
  await saveBilling({ caps: next, alertAt80 });
  return done();
}

export async function addAlertAction(_p: BillingState, data: FormData): Promise<BillingState> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  if (!(await can("billing"))) return { errors: { alert: NO } };
  const b = await billingSettings();
  const r = parseAlert(String(data.get("scope") ?? ""), String(data.get("amount") ?? ""), await scopesOf(), b.alerts);
  if (!r.alert) return { errors: { alert: r.error ?? "That alert could not be added" } };
  const added = r.alert;
  await saveBilling((now) => ({ alerts: [...now.alerts.filter((a) => !(a.scope === added.scope && a.amountEur === added.amountEur)), added] }));
  await logActivity("settings", `Added an alert for when ${scopeLabel(r.alert.scope)} passes ${eur(r.alert.amountEur)}`);
  return done();
}

export async function removeAlertAction(scope: Scope, amountEur: number) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  if (!(await can("billing"))) return;
  const b = await billingSettings();
  const gone = (a: { scope: Scope; amountEur: number }) => a.scope === scope && a.amountEur === amountEur;
  if (!b.alerts.some(gone)) return;
  await saveBilling((now) => ({ alerts: now.alerts.filter((a) => !gone(a)) }));
  await logActivity("settings", `Removed the alert for when ${scopeLabel(scope)} passes ${eur(amountEur)}`);
  revalidatePath("/dashboard/billing");
}

export async function saveAiModelAction(model: AiModel) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  if (!(await can("billing")) || !AI_MODELS.includes(model) || !(await enabledModules()).has("ai")) return;
  if ((await billingSettings()).aiModel === model) return;
  await saveBilling({ aiModel: model });
  await logActivity("settings", `Changed AI writing to ${KINDS.ai[model]}`);
  revalidatePath("/dashboard/billing");
}

// Billing details are the Owner's to change: they say who the bills are made out to.
const details = z.object({
  company: z.string().trim().min(1, "Enter the company name").max(100),
  vatNumber: z.string().trim().max(20, "At most 20 characters"),
  address: z.string().trim().min(1, "Enter the billing address").max(200),
  email: z.email("Enter a valid email").max(120),
});
export async function saveDetailsAction(_p: BillingState, data: FormData): Promise<BillingState> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  if ((await currentMember()).role !== "Owner") return { errors: { company: "Only the owner can change the billing details" } };
  const r = details.safeParse(Object.fromEntries(data));
  if (!r.success) return { errors: fieldErrors(r.error) };
  const apply = (s: Partial<DealerSettings>) => ({ ...SETTINGS_DEFAULT, ...s, billingDetails: r.data, updatedAt: Date.now() });
  if (!(await settingsStore.update("dealer", apply))) await settingsStore.put(apply({})); // never over a change saved meanwhile
  await logActivity("settings", "Changed the billing details");
  return done();
}

