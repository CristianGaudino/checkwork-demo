import "server-only";
import { DETAIL_LABELS } from "@/lib/leads/schema";
import type { LeadRow } from "@/lib/leads/process";
import { ALERT_KINDS, alertsStore, customersStore, drivesStore, leadsStore, type AlertKind, type Customer, type Lead, type LeadType, type StockAlert, type TestDrive } from "./collections";

// What visitors send reaches the dealer's admin as records. The lead pipeline (consent, bot check, retention) stays the one way in:
// after a lead is stored, this copies it into the admin's own collections so it can be worked (status, notes, who has it). The copies
// are marked by an id starting "real-" and are deleted with the lead by the daily purge (src/lib/leads/purge.ts).
const LEAD_TYPE: Record<Exclude<LeadRow["type"], "alert">, LeadType> = { enquiry: "enquiry", sourcing: "find-a-car", trade_in: "trade-in", finance: "finance", general: "general", test_drive: "test-drive" };

// A day and a time said in Irish time, as the moment they mean. Tries the offset twice so the hour that clocks change on still lands right.
export function dublinMs(date: string, time: string): number {
  const guess = Date.parse(`${date}T${time}:00Z`);
  const offset = (ms: number) => {
    const name = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Dublin", timeZoneName: "shortOffset" }).formatToParts(new Date(ms)).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    return Number(/GMT([+-]\d+)?/.exec(name)?.[1] ?? 0) * 3_600_000;
  };
  return guess - offset(guess - offset(guess));
}

// The visitor's own words, or the answers they gave when the form has no free text (a trade-in, a finance application).
function messageOf(row: LeadRow): string {
  if (row.message) return row.message;
  const given = Object.entries(DETAIL_LABELS).filter(([k]) => row.details[k] !== undefined).map(([k, label]) => `${label}: ${row.details[k]}`);
  return given.join(". ");
}

async function customerId(row: LeadRow): Promise<string> {
  const key = (row.email ?? row.phone ?? row.name).toLowerCase().replace(/\s+/g, "");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return "real-c-" + [...new Uint8Array(hash).slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type Mirror = { lead?: Lead; drive?: TestDrive; alert?: StockAlert };
export function mirrorOf(row: LeadRow): Mirror {
  const id = `real-${row.id}`;
  const at = row.consentAt.getTime();
  if (row.type === "alert") {
    const kind = ALERT_KINDS.includes(row.details.alertKind as AlertKind) ? (row.details.alertKind as AlertKind) : "new-arrival";
    return { alert: { id, email: row.email ?? "", kind, criteria: row.carTitle ?? "Any new arrival", active: true, createdAt: at } };
  }
  const drive = row.type === "test_drive" && row.carSlug && row.carTitle ? { id, name: row.name, email: row.email ?? "", phone: row.phone ?? "", carSlug: row.carSlug, carTitle: row.carTitle, startsAt: dublinMs(String(row.details.driveDate), String(row.details.driveTime)), status: "requested" as const, notes: row.message ?? "", createdAt: at } : undefined;
  const lead: Lead = {
    id,
    type: LEAD_TYPE[row.type],
    status: "new",
    name: row.name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    message: row.type === "test_drive" ? `Test drive on ${row.details.driveDate} at ${row.details.driveTime}.${row.message ? " " + row.message : ""}` : messageOf(row),
    source: "Website",
    carSlug: row.carSlug ?? undefined,
    carTitle: row.carTitle ?? undefined,
    notes: [],
    createdAt: at,
  };
  return { lead, drive };
}

// Best effort: the lead is already stored and emailed, so a failure here must never turn into a failed form.
export async function mirrorLead(row: LeadRow): Promise<void> {
  const m = mirrorOf(row);
  if (m.alert) await alertsStore.put(m.alert);
  if (m.lead) await leadsStore.put(m.lead);
  if (m.drive) await drivesStore.put(m.drive);
  if (m.lead) {
    const id = await customerId(row);
    const known = await customersStore.get(id);
    const c: Customer = known ?? { id, name: row.name, email: row.email ?? "", phone: row.phone ?? "", source: "Website", marketingConsent: false, createdAt: row.consentAt.getTime(), lastContactAt: 0 };
    await customersStore.put({ ...c, lastContactAt: row.consentAt.getTime() });
  }
}
