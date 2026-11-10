"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LEAD_STATUSES, getSettings, leadsStore } from "@/lib/admin/collections";

const update = z.object({ status: z.enum(LEAD_STATUSES), assignedTo: z.string().max(80).optional() });

// Status and who has it. Anything the form sends that is not a known value is dropped by the check.
export async function updateLeadAction(id: string, data: FormData) {
  const parsed = update.safeParse(Object.fromEntries(data));
  const lead = await leadsStore.get(id);
  if (!parsed.success || !lead) return;
  // Only someone on the team can have a lead; an empty choice means nobody.
  const { team } = await getSettings();
  const who = parsed.data.assignedTo && team.some((t) => t.name === parsed.data.assignedTo) ? parsed.data.assignedTo : undefined;
  await leadsStore.put({ ...lead, status: parsed.data.status, assignedTo: who });
  revalidatePath("/admin/leads");
}

export async function addNoteAction(id: string, data: FormData) {
  const text = String(data.get("note") ?? "").trim().slice(0, 500);
  const lead = await leadsStore.get(id);
  if (!text || !lead) return;
  await leadsStore.put({ ...lead, notes: [...lead.notes, { at: Date.now(), text }] });
  revalidatePath(`/admin/leads/${id}`);
}
