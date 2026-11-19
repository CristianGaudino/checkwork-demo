"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activity";
import { addDays, dublinDay, fmtDate, isIsoDay } from "@/lib/admin/format";
import { isOpenLead } from "@/lib/admin/leads";
import { LEAD_STATUSES, LEAD_TYPE_LABELS, LOST_REASONS, getSettings, leadStatusLabel, leadsStore } from "@/lib/admin/collections";
import { appendNote } from "@/lib/admin/notes";
import { notify } from "@/lib/admin/notifications";
import { currentMember } from "@/lib/permissions";
import { requireStaff } from "@/lib/staff";

const ref = (id: string) => ({ kind: "lead" as const, id });

const status = z.enum(LEAD_STATUSES);
// Why a lost lead was lost, from the fixed list, so the reports can count it.
const reason = z.enum(LOST_REASONS);

// One tap, one change. Anything that is not a known status is dropped by the check.
// `on` and `reason`: what Undo puts back with the status it had (a follow-up day, why it was lost), since moving on cleared them.
export async function setStatusAction(id: string, data: FormData) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  const parsed = status.safeParse(data.get("status"));
  const lead = await leadsStore.get(id);
  if (!parsed.success || !lead || lead.status === parsed.data) return;
  const on = String(data.get("on") ?? "");
  const why = reason.safeParse(data.get("reason"));
  // A won or lost lead needs no follow-up. The reason belongs to a lost lead only: moving it on clears it.
  const followUpOn = isOpenLead({ status: parsed.data }) ? (lead.followUpOn ?? (isIsoDay(on) ? on : undefined)) : undefined;
  const lostReason = parsed.data === "lost" ? (lead.lostReason ?? (why.success ? why.data : undefined)) : undefined;
  if (!(await leadsStore.update(id, (l) => ({ ...l, status: parsed.data, followUpOn, lostReason })))) return;
  await logActivity("leads", `Moved the lead from ${leadStatusLabel(lead.type, lead.status)} to ${leadStatusLabel(lead.type, parsed.data)}`, ref(id));
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${id}`);
  revalidatePath(`/dashboard/aftersales/requests/${id}`);
}

export async function setLostReasonAction(id: string, data: FormData) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  const parsed = reason.safeParse(data.get("reason"));
  const lead = await leadsStore.get(id);
  if (!parsed.success || lead?.status !== "lost" || lead.lostReason === parsed.data) return;
  if (!(await leadsStore.update(id, (l) => ({ ...l, lostReason: parsed.data })))) return;
  await logActivity("leads", `Said why the lead was lost: ${parsed.data}`, ref(id));
  revalidatePath(`/dashboard/leads/${id}`);
  revalidatePath(`/dashboard/aftersales/requests/${id}`);
}

// Only someone on the team can have a lead; an empty choice means nobody.
export async function assignLeadAction(id: string, data: FormData) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  const name = String(data.get("assignedTo") ?? "").slice(0, 80);
  const lead = await leadsStore.get(id);
  if (!lead) return;
  const { team } = await getSettings();
  const to = team.some((t) => t.name === name) ? name : undefined;
  if (name && !to) return { error: `${name} is no longer on the team.` }; // a stale page: never take the lead off its person by mistake
  if (to === lead.assignedTo) return;
  if (!(await leadsStore.update(id, (l) => ({ ...l, assignedTo: to })))) return;
  await logActivity("leads", to ? `Gave the lead to ${to}` : `Took the lead off ${lead.assignedTo}`, ref(id));
  // The person it was given to hears of it in their bell, unless they took it themselves.
  const me = await currentMember();
  if (to && to !== me.name) await notify({ kind: "assigned", for: to, text: `${me.name} gave you a lead: ${LEAD_TYPE_LABELS[lead.type]}`, href: `/dashboard/leads/${id}` });
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${id}`);
  revalidatePath(`/dashboard/aftersales/requests/${id}`);
}

export async function addNoteAction(id: string, data: FormData) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  if (!(await appendNote(leadsStore, id, data))) return;
  await logActivity("leads", "Added a note", ref(id)); // never the note itself
  revalidatePath(`/dashboard/leads/${id}`);
  revalidatePath(`/dashboard/aftersales/requests/${id}`);
}

// The day to get back to them: a quick choice (1, 3 or 7 days from today, Irish time), a date typed in, or nothing to clear it. A day that
// has passed, a date more than a year out, or a lead already won or lost is refused.
export async function setFollowUpAction(id: string, data: FormData) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  const lead = await leadsStore.get(id);
  if (!lead || !isOpenLead(lead)) return;
  const today = dublinDay();
  const inDays = Number(data.get("in"));
  const typed = String(data.get("on") ?? "");
  const on = data.get("clear") ? undefined : [1, 3, 7].includes(inDays) ? addDays(today, inDays) : isIsoDay(typed) ? typed : null;
  if (on === null || (on && (on < today || on > addDays(today, 366))) || on === lead.followUpOn) return;
  if (!(await leadsStore.update(id, (l) => ({ ...l, followUpOn: on })))) return;
  await logActivity("leads", on ? `Set a follow-up for ${fmtDate(`${on}T12:00:00Z`)}` : "Cleared the follow-up", ref(id));
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${id}`);
  revalidatePath(`/dashboard/aftersales/requests/${id}`);
}
