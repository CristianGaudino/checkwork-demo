"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activity";
import { CLAIM_STATUSES, CLAIM_STATUS_LABELS, claimsStore, coverEnds, leadsStore, salesStore } from "@/lib/admin/collections";
import { dublinDay, fmtEur } from "@/lib/admin/format";
import { newId } from "@/lib/admin/ids";
import { appendNote } from "@/lib/admin/notes";
import { BAD_COST, parseCost } from "@/lib/admin/margins";
import { fieldErrors, isoDay, type FormState } from "@/lib/admin/validation";
import { can } from "@/lib/permissions";
import { requireModule } from "@/lib/modules";
import { requireStaff } from "@/lib/staff";

// Warranty claims: anyone on the team opens one and moves it along; what the repair cost is for staff who see margins, since it counts
// against the car's margin. Recorded against the car in the activity history, never with the fault or the person.
const carRef = (c: { carId: string; carTitle: string }) => ({ kind: "car" as const, id: c.carId, label: c.carTitle });
const paths = (id: string) => {
  revalidatePath("/dashboard/aftersales");
  revalidatePath(`/dashboard/aftersales/${id}`);
};

const opening = z.object({
  saleId: z.string().min(1, "Choose the car they bought").max(60),
  fault: z.string().trim().min(1, "Say what the fault is").max(1000),
  openedOn: isoDay("Choose the day"),
  leadId: z.string().max(60).optional(),
});

// Whether it is in cover is worked out from the sale (the day sold and the months of cover), never typed.
export async function openClaimAction(_prev: FormState, data: FormData): Promise<FormState> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("service"); // and only while the dealer has it
  const r = opening.safeParse(Object.fromEntries(data));
  if (!r.success) return { errors: fieldErrors(r.error) };
  const d = r.data;
  const sale = await salesStore.get(d.saleId);
  if (!sale) return { errors: { saleId: "Choose the car they bought" } };
  if (d.openedOn > dublinDay() || d.openedOn < sale.soldOn) return { errors: { openedOn: "Choose a day from the sale to today" } };
  const lead = d.leadId ? await leadsStore.get(d.leadId) : undefined;
  const id = newId("claim");
  const carId = sale.carId ?? sale.id;
  await claimsStore.put({ id, saleId: sale.id, carId, carTitle: sale.carTitle, customerId: sale.customerId, openedOn: d.openedOn, fault: d.fault, inCover: d.openedOn <= coverEnds(sale), status: "open", ...(lead && { leadId: lead.id }), notes: [], createdAt: Date.now() });
  if (lead) await leadsStore.put({ ...lead, status: lead.status === "new" ? "contacted" : lead.status, notes: [...lead.notes, { at: Date.now(), text: "Opened a warranty claim." }] });
  await logActivity("customers", "Opened a warranty claim", carRef({ carId, carTitle: sale.carTitle }));
  redirect(`/dashboard/aftersales/${id}`);
}

const status = z.enum(CLAIM_STATUSES);
export async function setClaimStatusAction(id: string, data: FormData) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("service"); // and only while the dealer has it
  const to = status.safeParse(data.get("status"));
  const claim = await claimsStore.get(id);
  if (!to.success || !claim || claim.status === to.data) return;
  await claimsStore.put({ ...claim, status: to.data });
  await logActivity("customers", `Moved the warranty claim from ${CLAIM_STATUS_LABELS[claim.status]} to ${CLAIM_STATUS_LABELS[to.data]}`, carRef(claim));
  paths(id);
}

export async function addClaimNoteAction(id: string, data: FormData) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("service"); // and only while the dealer has it
  const claim = await appendNote(claimsStore, id, data);
  if (!claim) return;
  await logActivity("customers", "Added a note to the warranty claim", carRef(claim)); // never the note itself
  paths(id);
}

export type CostState = { error?: string; saved?: number } | undefined;
export async function setClaimCostAction(id: string, _prev: CostState, data: FormData): Promise<CostState> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("service"); // and only while the dealer has it
  const claim = (await can("margins")) ? await claimsStore.get(id) : undefined;
  if (!claim) return { error: "Only staff who see margins can enter the cost" };
  const cost = parseCost(String(data.get("costEur") ?? ""));
  if (cost === "invalid") return { error: BAD_COST };
  await claimsStore.put({ ...claim, costEur: cost ?? undefined });
  await logActivity("customers", cost === null ? "Cleared the warranty repair cost" : `Set the warranty repair cost to ${fmtEur(cost)}`, carRef(claim));
  paths(id);
  return { saved: Date.now() };
}
