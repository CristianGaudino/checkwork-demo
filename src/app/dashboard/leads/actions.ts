"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LEAD_STATUSES, getSettings, leadsStore } from "@/lib/admin/collections";

const status = z.enum(LEAD_STATUSES);

// One tap, one change. Anything that is not a known status is dropped by the check.
export async function setStatusAction(id: string, data: FormData) {
  const parsed = status.safeParse(data.get("status"));
  const lead = await leadsStore.get(id);
  if (!parsed.success || !lead) return;
  await leadsStore.put({ ...lead, status: parsed.data });
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${id}`);
}

// Only someone on the team can have a lead; an empty choice means nobody.
export async function assignLeadAction(id: string, data: FormData) {
  const name = String(data.get("assignedTo") ?? "").slice(0, 80);
  const lead = await leadsStore.get(id);
  if (!lead) return;
  const { team } = await getSettings();
  await leadsStore.put({ ...lead, assignedTo: team.some((t) => t.name === name) ? name : undefined });
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${id}`);
}

export async function addNoteAction(id: string, data: FormData) {
  const text = String(data.get("note") ?? "").trim().slice(0, 500);
  const lead = await leadsStore.get(id);
  if (!text || !lead) return;
  await leadsStore.put({ ...lead, notes: [...lead.notes, { at: Date.now(), text }] });
  revalidatePath(`/dashboard/leads/${id}`);
}
