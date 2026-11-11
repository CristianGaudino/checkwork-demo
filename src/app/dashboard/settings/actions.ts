"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendToDealer } from "@/lib/leads/mail";
import { DEALER_COLLECTIONS, getSettings, leadsStore, settingsStore, type DealerSettings } from "@/lib/admin/collections";
import { EMAIL_INVALID, NAME_REQUIRED } from "@/lib/copy";
import { newId } from "@/lib/admin/ids";
import { seedsDemoRecords } from "@/lib/admin/docs";
import { fieldErrors } from "@/lib/admin/validation";
import { can, currentMember } from "@/lib/permissions";
import { ROLES, type Role } from "@/lib/permission-rules";
import { logActivity, resetActivity } from "@/lib/admin/activity";
import { resetSyncStatus } from "@/lib/donedeal/sync";

export type SettingsState = { errors?: Record<string, string>; saved?: boolean } | undefined;

// Only owners and managers change the business settings, checked here whatever the page showed.
const NOT_ALLOWED = "Only an owner or manager can change this";
const refused = async (field: string): Promise<SettingsState | null> => ((await can("settings")) ? null : { errors: { [field]: NOT_ALLOWED } });

// Reads the current record, applies one change and writes it back, so each panel saves on its own.
async function change(fn: (s: DealerSettings) => DealerSettings) {
  await settingsStore.put({ ...fn(await getSettings()), updatedAt: Date.now() });
  revalidatePath("/dashboard/settings");
}

const fail = (e: z.ZodError): SettingsState => ({ errors: fieldErrors(e) });
// A save that changes nothing is not recorded in the activity history. Same keys in the same order, as each form always sends them.
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const targets = z.object({
  leadSlaHours: z.coerce.number().int("Whole hours").min(1, "At least 1 hour").max(168, "At most 168 hours (a week)"),
  driveSlotMinutes: z.coerce.number().int("Whole minutes").min(15, "At least 15 minutes").max(240, "At most 240 minutes"),
});
export async function saveTargetsAction(_p: SettingsState, data: FormData): Promise<SettingsState> {
  const no = await refused("leadSlaHours");
  if (no) return no;
  const r = targets.safeParse(Object.fromEntries(data));
  if (!r.success) return fail(r.error);
  const was = await getSettings();
  await change((s) => ({ ...s, ...r.data }));
  if (was.leadSlaHours !== r.data.leadSlaHours) await logActivity("settings", `Changed the lead reply target from ${was.leadSlaHours} to ${r.data.leadSlaHours} hours`);
  if (was.driveSlotMinutes !== r.data.driveSlotMinutes) await logActivity("settings", `Changed the test drive slot from ${was.driveSlotMinutes} to ${r.data.driveSlotMinutes} minutes`);
  return { saved: true };
}

export async function saveNotificationsAction(_p: SettingsState, data: FormData): Promise<SettingsState> {
  const no = await refused("notifications");
  if (no) return no;
  const on = (k: string) => data.get(k) === "on";
  const notifications = { newLead: on("newLead"), testDrive: on("testDrive"), review: on("review"), weeklyReport: on("weeklyReport"), followUps: on("followUps") };
  const was = await getSettings();
  await change((s) => ({ ...s, notifications }));
  if (!same(was.notifications, notifications)) await logActivity("settings", "Changed the email notifications");
  return { saved: true };
}

const marketing = z.object({ voice: z.string().trim().max(200), hashtags: z.string().trim().max(120), signOff: z.string().trim().max(160) });
export async function saveMarketingAction(_p: SettingsState, data: FormData): Promise<SettingsState> {
  const no = await refused("voice");
  if (no) return no;
  const r = marketing.safeParse(Object.fromEntries(data));
  if (!r.success) return fail(r.error);
  const was = await getSettings();
  await change((s) => ({ ...s, marketing: r.data }));
  if (!same(was.marketing, r.data)) await logActivity("settings", "Changed the marketing voice");
  return { saved: true };
}

// The addresses that get the email when a visitor sends a form. Up to five, one per line or comma. Empty goes back to the site's own setting.
const MAX_LEAD_EMAILS = 5;
export async function saveLeadEmailsAction(_p: SettingsState, data: FormData): Promise<SettingsState> {
  const no = await refused("leadEmails");
  if (no) return no;
  const list = [...new Set(String(data.get("leadEmails") ?? "").split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (list.length > MAX_LEAD_EMAILS) return { errors: { leadEmails: `Use ${MAX_LEAD_EMAILS} addresses or fewer` } };
  const bad = list.find((e) => !z.email().max(120).safeParse(e).success);
  if (bad) return { errors: { leadEmails: `"${bad.slice(0, 40)}" is not a valid email` } };
  const was = await getSettings();
  await change((s) => ({ ...s, leadEmails: list }));
  if (!same(was.leadEmails, list)) await logActivity("settings", "Changed who gets the lead emails");
  return { saved: true };
}

// Sends one test message to the saved addresses so the dealer can see it arrive.
export async function sendTestEmailAction(): Promise<SettingsState> {
  const no = await refused("test");
  if (no) return no;
  try {
    await sendToDealer({ subject: "Test email from your dealer dashboard", text: "If you can read this, new leads will reach this address." });
    return { saved: true };
  } catch {
    return { errors: { test: "The test email did not go. Email is not set up on this site yet, or there is no address to send to." } };
  }
}

// The team decides who sees what (src/lib/permissions.ts), so only owners and managers change it, checked here whatever the page showed.
// A manager cannot add, change or remove an owner (nor make anyone one), so nobody below owner can take the dealership over. Emails are
// unique, since a signed-in person is matched to the team by email. A team that has an owner always keeps one.
const NO_TEAM = "Only an owner or manager can change the team";
const OWNERS_ONLY = "Only an owner can change an owner";
const NO_OWNER = "Keep at least one owner on the team";
const hasOwner = (team: DealerSettings["team"]) => team.some((t) => t.role === "Owner");
// Whether the signed-in person may make a change that touches these roles (the person's old and new role).
async function mayTouch(...roles: (Role | undefined)[]): Promise<string | null> {
  const me = await currentMember();
  if (!(await can("team"))) return NO_TEAM;
  return roles.includes("Owner") && me.role !== "Owner" ? OWNERS_ONLY : null;
}

const member = z.object({ name: z.string().trim().min(1, NAME_REQUIRED).max(60), email: z.string().trim().toLowerCase().email(EMAIL_INVALID).max(120), role: z.enum(ROLES) });
export async function addTeamAction(_p: SettingsState, data: FormData): Promise<SettingsState> {
  const r = member.safeParse(Object.fromEntries(data));
  if (!r.success) return fail(r.error);
  const no = await mayTouch(r.data.role);
  if (no) return { errors: { role: no } };
  const { team } = await getSettings();
  if (team.some((t) => t.name.toLowerCase() === r.data.name.toLowerCase())) return { errors: { name: "Someone with that name is already on the team" } };
  if (team.some((t) => t.email.toLowerCase() === r.data.email)) return { errors: { email: "Someone with that email is already on the team" } };
  const id = newId("u");
  await change((s) => ({ ...s, team: [...s.team, { id, ...r.data }] }));
  await logActivity("settings", `Added ${r.data.name} to the team as ${r.data.role}`, { kind: "team", id, label: r.data.name });
  return { saved: true };
}

export async function setRoleAction(id: string, _p: SettingsState, data: FormData): Promise<SettingsState> {
  const role = z.enum(ROLES).safeParse(data.get("role"));
  if (!role.success) return { errors: { role: "Choose a role" } };
  const { team } = await getSettings();
  const was = team.find((t) => t.id === id);
  if (!was) return { errors: { role: "That person is no longer on the team" } };
  const no = await mayTouch(was.role, role.data);
  if (no) return { errors: { role: no } };
  const next = team.map((t) => (t.id === id ? { ...t, role: role.data } : t));
  if (hasOwner(team) && !hasOwner(next)) return { errors: { role: NO_OWNER } };
  if (was.role === role.data) return { saved: true };
  await change((s) => ({ ...s, team: next }));
  await logActivity("settings", `Changed ${was.name}'s role from ${was.role} to ${role.data}`, { kind: "team", id, label: was.name });
  return { saved: true };
}

// The last person cannot be removed: leads are assigned to the team, so it is never empty.
// Their leads go back to nobody, so no lead points at someone the picker no longer lists.
export async function removeTeamAction(id: string) {
  const { team } = await getSettings();
  const gone = team.length > 1 ? team.find((t) => t.id === id) : undefined;
  if (!gone || (await mayTouch(gone.role))) return;
  if (hasOwner(team) && !hasOwner(team.filter((t) => t.id !== id))) return;
  await change((s) => ({ ...s, team: s.team.filter((t) => t.id !== id) }));
  for (const l of await leadsStore.list()) if (l.assignedTo === gone.name) await leadsStore.put({ ...l, assignedTo: undefined });
  await logActivity("settings", `Removed ${gone.name} from the team`, { kind: "team", id, label: gone.name });
}

export async function resetDemoAction() {
  if (!seedsDemoRecords() || !(await can("settings"))) return; // a real dealer's records are never wiped from a button
  for (const c of DEALER_COLLECTIONS) await c.reset();
  await resetActivity();
  await resetSyncStatus();
  await logActivity("settings", "Reset the demo data");
  revalidatePath("/dashboard", "layout");
}
