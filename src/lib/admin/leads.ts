import { LEAD_STATUSES, LEAD_TYPES, type Lead, type LeadStatus, type LeadType } from "./collections";
import { followUpDue } from "./follow-ups";
export { followUpDue, isOpenLead } from "./follow-ups";

// The leads list's filters. Each one comes from the URL, so anything that is not a known value is ignored, never trusted.
export type LeadFilter = { status?: LeadStatus; type?: LeadType; q: string; due?: boolean };

export function parseLeadFilter(sp: { status?: string; type?: string; q?: string; due?: string }): LeadFilter {
  return {
    due: sp.due === "1" || undefined,
    status: (LEAD_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as LeadStatus) : undefined,
    type: (LEAD_TYPES as readonly string[]).includes(sp.type ?? "") ? (sp.type as LeadType) : undefined,
    q: (sp.q ?? "").trim().toLowerCase().slice(0, 60),
  };
}

// `today`: the Irish day (dublinDay), for the Follow-ups due filter.
export function filterLeads(leads: Lead[], f: LeadFilter, today = ""): Lead[] {
  return leads
    .filter((l) => !f.due || followUpDue(l, today))
    .filter((l) => !f.status || l.status === f.status)
    .filter((l) => !f.type || l.type === f.type)
    .filter((l) => !f.q || `${l.name} ${l.email} ${l.carTitle ?? ""} ${l.message}`.toLowerCase().includes(f.q))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function countByStatus(leads: Lead[]): Record<LeadStatus, number> {
  const out = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const l of leads) out[l.status]++;
  return out;
}
