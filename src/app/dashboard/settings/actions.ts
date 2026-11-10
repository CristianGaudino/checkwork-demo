"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendToDealer } from "@/lib/leads/mail";
import { DEALER_COLLECTIONS, getSettings, leadsStore, settingsStore, type DealerSettings } from "@/lib/admin/collections";
import { EMAIL_INVALID, NAME_REQUIRED } from "@/lib/copy";
import { newId } from "@/lib/admin/ids";
import { fieldErrors } from "@/lib/admin/validation";

export type SettingsState = { errors?: Record<string, string>; saved?: boolean } | undefined;

// Reads the current record, applies one change and writes it back, so each panel saves on its own.
async function change(fn: (s: DealerSettings) => DealerSettings) {
  await settingsStore.put({ ...fn(await getSettings()), updatedAt: Date.now() });
  revalidatePath("/dashboard/settings");
}

const fail = (e: z.ZodError): SettingsState => ({ errors: fieldErrors(e) });

const targets = z.object({
  leadSlaHours: z.coerce.number().int("Whole hours").min(1, "At least 1 hour").max(168, "At most 168 hours (a week)"),
  driveSlotMinutes: z.coerce.number().int("Whole minutes").min(15, "At least 15 minutes").max(240, "At most 240 minutes"),
});
export async function saveTargetsAction(_p: SettingsState, data: FormData): Promise<SettingsState> {
  const r = targets.safeParse(Object.fromEntries(data));
  if (!r.success) return fail(r.error);
  await change((s) => ({ ...s, ...r.data }));
  return { saved: true };
}

export async function saveNotificationsAction(_p: SettingsState, data: FormData): Promise<SettingsState> {
  const on = (k: string) => data.get(k) === "on";
  await change((s) => ({ ...s, notifications: { newLead: on("newLead"), testDrive: on("testDrive"), review: on("review"), weeklyReport: on("weeklyReport") } }));
  return { saved: true };
}

const marketing = z.object({ voice: z.string().trim().max(200), hashtags: z.string().trim().max(120), signOff: z.string().trim().max(160) });
export async function saveMarketingAction(_p: SettingsState, data: FormData): Promise<SettingsState> {
  const r = marketing.safeParse(Object.fromEntries(data));
  if (!r.success) return fail(r.error);
  await change((s) => ({ ...s, marketing: r.data }));
  return { saved: true };
}

// The addresses that get the email when a visitor sends a form. Up to five, one per line or comma. Empty goes back to the site's own setting.
const MAX_LEAD_EMAILS = 5;
export async function saveLeadEmailsAction(_p: SettingsState, data: FormData): Promise<SettingsState> {
  const list = [...new Set(String(data.get("leadEmails") ?? "").split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (list.length > MAX_LEAD_EMAILS) return { errors: { leadEmails: `Use ${MAX_LEAD_EMAILS} addresses or fewer` } };
  const bad = list.find((e) => !z.email().max(120).safeParse(e).success);
  if (bad) return { errors: { leadEmails: `"${bad.slice(0, 40)}" is not a valid email` } };
  await change((s) => ({ ...s, leadEmails: list }));
  return { saved: true };
}

// Sends one test message to the saved addresses so the dealer can see it arrive.
export async function sendTestEmailAction(): Promise<SettingsState> {
  try {
    await sendToDealer({ subject: "Test email from your dealer dashboard", text: "If you can read this, new leads will reach this address." });
    return { saved: true };
  } catch {
    return { errors: { test: "The test email did not go. Email is not set up on this site yet, or there is no address to send to." } };
  }
}

const member = z.object({ name: z.string().trim().min(1, NAME_REQUIRED).max(60), email: z.string().trim().email(EMAIL_INVALID).max(120), role: z.enum(["Owner", "Sales", "Finance"]) });
export async function addTeamAction(_p: SettingsState, data: FormData): Promise<SettingsState> {
  const r = member.safeParse(Object.fromEntries(data));
  if (!r.success) return fail(r.error);
  const { team } = await getSettings();
  if (team.some((t) => t.name.toLowerCase() === r.data.name.toLowerCase())) return { errors: { name: "Someone with that name is already on the team" } };
  await change((s) => ({ ...s, team: [...s.team, { id: newId("u"), ...r.data }] }));
  return { saved: true };
}

// The last person cannot be removed: leads are assigned to the team, so it is never empty.
// Their leads go back to nobody, so no lead points at someone the picker no longer lists.
export async function removeTeamAction(id: string) {
  const { team } = await getSettings();
  const gone = team.length > 1 ? team.find((t) => t.id === id) : undefined;
  if (!gone) return;
  await change((s) => ({ ...s, team: s.team.filter((t) => t.id !== id) }));
  for (const l of await leadsStore.list()) if (l.assignedTo === gone.name) await leadsStore.put({ ...l, assignedTo: undefined });
}

export async function resetDemoAction() {
  for (const c of DEALER_COLLECTIONS) await c.reset();
  revalidatePath("/dashboard", "layout");
}
