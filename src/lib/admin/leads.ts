import { LEAD_SOURCES, LEAD_STATUSES, LEAD_TYPES, type Claim, type Lead, type LeadStatus, type LeadType } from "./collections";
import { TOPIC_IDS, isUrgent, type TopicId } from "@/lib/leads/contact-topics";
import { followUpDue, pastReplyTarget } from "./follow-ups";
export { followUpDue, isOpenLead } from "./follow-ups";

// A warranty message from the website is aftersales work, not a sale: it is listed in Aftersales as a request, and left out of Leads, its
// counts, the overview and the reports. A person's own page and their data requests still show everything.
export const isSalesLead = (l: Pick<Lead, "type">) => l.type !== "warranty";
export const SALES_LEAD_TYPES = LEAD_TYPES.filter((t) => t !== "warranty");
// The warranty requests still to deal with: no claim opened from them yet, and not set aside (lost). Newest first.
export const openWarrantyRequests = (leads: Lead[], claims: Pick<Claim, "leadId">[]) => {
  const claimed = new Set(claims.map((c) => c.leadId));
  return leads.filter((l) => l.type === "warranty" && l.status !== "lost" && !claimed.has(l.id)).sort((a, b) => b.createdAt - a.createdAt);
};

// The leads list's filters. Each one comes from the URL, so anything that is not a known value is ignored, never trusted.
// due: follow-ups due; late: new leads past the reply target. One or the other. with: who has it (a name, or "none"); source: where it came from.
export type LeadFilter = { status?: LeadStatus; type?: LeadType; topic?: string; q: string; due?: boolean; late?: boolean; with?: string; source?: (typeof LEAD_SOURCES)[number] };

// `need` is the Filters panel's one choice (due or late); the older `due=1` and `late=1` links still work.
export function parseLeadFilter(sp: { status?: string; type?: string; topic?: string; q?: string; due?: string; late?: string; need?: string; with?: string; source?: string }): LeadFilter {
  const due = sp.due === "1" || sp.need === "due";
  return {
    with: sp.with?.slice(0, 80) || undefined,
    source: (LEAD_SOURCES as readonly string[]).includes(sp.source ?? "") ? (sp.source as LeadFilter["source"]) : undefined,
    due: due || undefined,
    late: (!due && (sp.late === "1" || sp.need === "late")) || undefined,
    status: (LEAD_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as LeadStatus) : undefined,
    type: (LEAD_TYPES as readonly string[]).includes(sp.type ?? "") ? (sp.type as LeadType) : undefined,
    topic: TOPIC_IDS.includes(sp.topic as TopicId) ? sp.topic : undefined,
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
    .filter((l) => !f.topic || l.topic === f.topic)
    .filter((l) => !f.with || (f.with === "none" ? !l.assignedTo : l.assignedTo === f.with))
    .filter((l) => !f.source || l.source === f.source)
    .filter((l) => !f.q || `${l.name} ${l.email} ${l.carTitle ?? ""} ${l.message}`.toLowerCase().includes(f.q) || (qDigits !== "" && digits(l.phone).includes(qDigits)))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function countByStatus(leads: Lead[]): Record<LeadStatus, number> {
  const out = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const l of leads) out[l.status]++;
  return out;
}

// New leads that need an answer first: "can't be driven", "this week". The rest keep their order.
export const urgentFirst = (leads: Lead[]): Lead[] => {
  const hot = (l: Lead) => l.status === "new" && Boolean(l.topic) && isUrgent(l.answers ?? {});
  return [...leads.filter(hot), ...leads.filter((l) => !hot(l))];
};
