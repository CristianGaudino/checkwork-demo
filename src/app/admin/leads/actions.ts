"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LEAD_STATUSES, TEAM, leadsStore } from "@/lib/admin/collections";

const update = z.object({ status: z.enum(LEAD_STATUSES), assignedTo: z.preprocess((v) => (v === "" ? undefined : v), z.enum(TEAM).optional()) });

// Status and who has it. Anything the form sends that is not a known value is dropped by the check.
export async function updateLeadAction(id: string, data: FormData) {
  const parsed = update.safeParse(Object.fromEntries(data));
  const lead = await leadsStore.get(id);
  if (!parsed.success || !lead) return;
  await leadsStore.put({ ...lead, status: parsed.data.status, assignedTo: parsed.data.assignedTo });
  revalidatePath("/admin/leads");
}

export async function addNoteAction(id: string, data: FormData) {
  const text = String(data.get("note") ?? "").trim().slice(0, 500);
  const lead = await leadsStore.get(id);
  if (!text || !lead) return;
  await leadsStore.put({ ...lead, notes: [...lead.notes, { at: Date.now(), text }] });
  revalidatePath(`/admin/leads/${id}`);
}
