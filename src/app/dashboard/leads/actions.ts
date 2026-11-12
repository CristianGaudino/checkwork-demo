"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activity";
import { addDays, dublinDay, fmtDate } from "@/lib/admin/format";
import { isOpenLead } from "@/lib/admin/leads";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LOST_REASONS, getSettings, leadsStore } from "@/lib/admin/collections";

const ref = (id: string) => ({ kind: "lead" as const, id });

const status = z.enum(LEAD_STATUSES);

// One tap, one change. Anything that is not a known status is dropped by the check.
export async function setStatusAction(id: string, data: FormData) {
  const parsed = status.safeParse(data.get("status"));
  const lead = await leadsStore.get(id);
  if (!parsed.success || !lead || lead.status === parsed.data) return;
  // A won or lost lead needs no follow-up.
  // The reason belongs to a lost lead only: moving it on clears it.
  await leadsStore.put({ ...lead, status: parsed.data, followUpOn: isOpenLead({ status: parsed.data }) ? lead.followUpOn : undefined, lostReason: parsed.data === "lost" ? lead.lostReason : undefined });
  await logActivity("leads", `Moved the lead from ${LEAD_STATUS_LABELS[lead.status]} to ${LEAD_STATUS_LABELS[parsed.data]}`, ref(id));
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${id}`);
}

// Why a lost lead was lost, from the fixed list, so the reports can count it.
const reason = z.enum(LOST_REASONS);
export async function setLostReasonAction(id: string, data: FormData) {
  const parsed = reason.safeParse(data.get("reason"));
  const lead = await leadsStore.get(id);
  if (!parsed.success || lead?.status !== "lost" || lead.lostReason === parsed.data) return;
  await leadsStore.put({ ...lead, lostReason: parsed.data });
  await logActivity("leads", `Said why the lead was lost: ${parsed.data}`, ref(id));
  revalidatePath(`/dashboard/leads/${id}`);
}

// Only someone on the team can have a lead; an empty choice means nobody.
export async function assignLeadAction(id: string, data: FormData) {
  const name = String(data.get("assignedTo") ?? "").slice(0, 80);
  const lead = await leadsStore.get(id);
  if (!lead) return;
  const { team } = await getSettings();
  const to = team.some((t) => t.name === name) ? name : undefined;
  if (to === lead.assignedTo) return;
  await leadsStore.put({ ...lead, assignedTo: to });
  await logActivity("leads", to ? `Gave the lead to ${to}` : `Took the lead off ${lead.assignedTo}`, ref(id));
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${id}`);
}

export async function addNoteAction(id: string, data: FormData) {
  const text = String(data.get("note") ?? "").trim().slice(0, 500);
  const lead = await leadsStore.get(id);
  if (!text || !lead) return;
  await leadsStore.put({ ...lead, notes: [...lead.notes, { at: Date.now(), text }] });
  await logActivity("leads", "Added a note", ref(id)); // never the note itself
  revalidatePath(`/dashboard/leads/${id}`);
}

// The day to get back to them: a quick choice (1, 3 or 7 days from today, Irish time), a date typed in, or nothing to clear it. A day that
// has passed, a date more than a year out, or a lead already won or lost is refused.
export async function setFollowUpAction(id: string, data: FormData) {
  const lead = await leadsStore.get(id);
  if (!lead || !isOpenLead(lead)) return;
  const today = dublinDay();
  const inDays = Number(data.get("in"));
  const typed = String(data.get("on") ?? "");
  const on = data.get("clear") ? undefined : [1, 3, 7].includes(inDays) ? addDays(today, inDays) : /^\d{4}-\d{2}-\d{2}$/.test(typed) ? typed : null;
  if (on === null || (on && (on < today || on > addDays(today, 366))) || on === lead.followUpOn) return;
  await leadsStore.put({ ...lead, followUpOn: on });
  await logActivity("leads", on ? `Set a follow-up for ${fmtDate(`${on}T12:00:00Z`)}` : "Cleared the follow-up", ref(id));
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${id}`);
}
