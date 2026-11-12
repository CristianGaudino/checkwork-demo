import { LEAD_STATUSES, LEAD_TYPES, type Lead, type LeadStatus, type LeadType } from "./collections";
import { followUpDue, pastReplyTarget } from "./follow-ups";
export { followUpDue, isOpenLead } from "./follow-ups";

// The leads list's filters. Each one comes from the URL, so anything that is not a known value is ignored, never trusted.
// due: follow-ups due; late: new leads past the reply target. One or the other.
export type LeadFilter = { status?: LeadStatus; type?: LeadType; q: string; due?: boolean; late?: boolean };

export function parseLeadFilter(sp: { status?: string; type?: string; q?: string; due?: string; late?: string }): LeadFilter {
  return {
    due: sp.due === "1" || undefined,
    late: (sp.due !== "1" && sp.late === "1") || undefined,
    status: (LEAD_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as LeadStatus) : undefined,
    type: (LEAD_TYPES as readonly string[]).includes(sp.type ?? "") ? (sp.type as LeadType) : undefined,
    q: (sp.q ?? "").trim().toLowerCase().slice(0, 60),
  };
}

const digits = (s: string) => s.replace(/\D/g, "");

// `today`: the Irish day (dublinDay), for the Follow-ups due filter. `slaHours`: the reply target, for the late filter.
export function filterLeads(leads: Lead[], f: LeadFilter, today = "", slaHours = 24, now = Date.now()): Lead[] {
  // A number is found however it was typed: "087 123" finds "0871234567". Only when the search has digits enough to mean a number.
  const qDigits = digits(f.q).length >= 3 ? digits(f.q).replace(/^0+/, "") : ""; // no leading 0: "087…" finds "+353 87…"
  return leads
    .filter((l) => !f.due || followUpDue(l, today))
    .filter((l) => !f.late || pastReplyTarget(l, now, slaHours))
    .filter((l) => !f.status || l.status === f.status)
    .filter((l) => !f.type || l.type === f.type)
    .filter((l) => !f.q || `${l.name} ${l.email} ${l.carTitle ?? ""} ${l.message}`.toLowerCase().includes(f.q) || (qDigits !== "" && digits(l.phone).includes(qDigits)))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function countByStatus(leads: Lead[]): Record<LeadStatus, number> {
  const out = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const l of leads) out[l.status]++;
  return out;
}
