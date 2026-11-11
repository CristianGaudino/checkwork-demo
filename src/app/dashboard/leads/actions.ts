"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activity";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, getSettings, leadsStore } from "@/lib/admin/collections";

const ref = (id: string) => ({ kind: "lead" as const, id });

const status = z.enum(LEAD_STATUSES);

// One tap, one change. Anything that is not a known status is dropped by the check.
export async function setStatusAction(id: string, data: FormData) {
  const parsed = status.safeParse(data.get("status"));
  const lead = await leadsStore.get(id);
  if (!parsed.success || !lead || lead.status === parsed.data) return;
  await leadsStore.put({ ...lead, status: parsed.data });
  await logActivity("leads", `Moved the lead from ${LEAD_STATUS_LABELS[lead.status]} to ${LEAD_STATUS_LABELS[parsed.data]}`, ref(id));
  revalidatePath("/dashboard/leads");
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
