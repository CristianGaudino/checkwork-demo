import "server-only";
import { DETAIL_LABELS } from "@/lib/leads/schema";
import { ANSWER_KEYS, readable } from "@/lib/leads/contact-topics";
import type { LeadRow } from "@/lib/leads/process";
import { clashes } from "./drives";
import { ALERT_KINDS, alertsStore, getSettings, customersStore, drivesStore, leadsStore, type AlertKind, type Customer, type Lead, type LeadType, type StockAlert, type TestDrive } from "./collections";
import { dublinMs } from "./format";
import { noticeOfLead, notify } from "./notifications";
import { MINUTE } from "@/lib/time";

// What visitors send reaches the dealer's admin as records. The lead pipeline (consent, bot check, retention) stays the one way in:
// after a lead is stored, this copies it into the admin's own collections so it can be worked (status, notes, who has it). The copies
// are marked by an id starting "real-" and are deleted with the lead by the daily purge (src/lib/leads/purge.ts).
const LEAD_TYPE: Record<Exclude<LeadRow["type"], "alert">, LeadType> = { enquiry: "enquiry", sourcing: "find-a-car", trade_in: "trade-in", finance: "finance", general: "general", test_drive: "test-drive", order: "order" };
// A general message is a warranty claim or a service request when it was sent from that page.
// The guided form's topic says the same when it is sent from /contact.
const pageType = (path: string, topic?: string | number): LeadType => (path.startsWith("/warranty") || topic === "bought" ? "warranty" : path.startsWith("/service") || topic === "service" ? "service" : "general");

// The answers they gave (a make and model, a trade-in's reg), then their own words: both, so a find-a-car or a factory order keeps the car.
// A factory order reads as the car it is ("Hyundai Tucson, 1.6 Hybrid, 271"), not as a list of form fields.
function messageOf(row: LeadRow): string {
  const d = row.details;
  const given =
    row.type === "order"
      ? [[d.make, d.model].filter(Boolean).join(" "), d.spec, d.regPeriod].filter(Boolean).map(String)
      : Object.entries(DETAIL_LABELS).filter(([k]) => d[k] !== undefined).map(([k, label]) => `${label}: ${readable(k, String(d[k]))}`);
  return [given.join(row.type === "order" ? ", " : ". "), row.message].filter(Boolean).join("\n\n");
}

async function customerId(row: LeadRow): Promise<string> {
  const key = (row.email ?? row.phone ?? row.name).toLowerCase().replace(/\s+/g, "");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return "real-c-" + [...new Uint8Array(hash).slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type Mirror = { lead?: Lead; drive?: TestDrive; alert?: StockAlert };
// emailed is false when the email to the dealer failed: the lead says so, as its first note, so the team replies from here.
export function mirrorOf(row: LeadRow, emailed = true): Mirror {
  const id = `real-${row.id}`;
  const at = row.consentAt.getTime();
  if (row.type === "alert") {
    const kind = ALERT_KINDS.includes(row.details.alertKind as AlertKind) ? (row.details.alertKind as AlertKind) : "new-arrival";
    // On, as the visitor was told. shortcut: nothing sends alerts and there is no confirm email (double opt-in); add both before a real site mails anyone.
    return { alert: { id, email: row.email ?? "", kind, criteria: row.carTitle ?? "Any new arrival", active: true, createdAt: at } };
  }
  const drive = row.type === "test_drive" && row.carSlug && row.carTitle ? { id, name: row.name, email: row.email ?? "", phone: row.phone ?? "", carSlug: row.carSlug, carTitle: row.carTitle, startsAt: dublinMs(String(row.details.driveDate), String(row.details.driveTime)), status: "requested" as const, notes: row.message ?? "", createdAt: at } : undefined;
  const lead: Lead = {
    id,
    type: row.type === "trade_in" && row.details.intent === "sell" ? "sell" : row.type === "general" ? pageType(row.sourcePath, row.details.topic) : LEAD_TYPE[row.type],
    status: "new",
    name: row.name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    message: row.type === "test_drive" ? `Test drive on ${row.details.driveDate} at ${row.details.driveTime}.${row.message ? " " + row.message : ""}` : messageOf(row),
    source: "Website",
    carSlug: row.carSlug ?? undefined,
    carTitle: row.carTitle ?? undefined,
    ...(typeof row.details.reg === "string" && { reg: row.details.reg }),
    ...(typeof row.details.topic === "string" && { topic: row.details.topic, answers: Object.fromEntries(ANSWER_KEYS.filter((k) => typeof row.details[k] === "string").map((k) => [k, String(row.details[k])])) }),
    ...(row.photoKeys.length > 0 && { photoKeys: row.photoKeys }),
    notes: emailed ? [] : [{ at, text: "The email about this lead didn't reach you. Reply from here." }],
    createdAt: at,
  };
  return { lead, drive };
}

// Best effort: the lead is already stored, so a failure here must never turn into a failed form.
export async function mirrorLead(row: LeadRow, emailed = true): Promise<void> {
  const m = mirrorOf(row, emailed);
  if (m.alert) await alertsStore.put(m.alert);
  if (m.lead) await leadsStore.put(m.lead);
  if (m.drive) {
    // One car cannot be out twice: the form hides taken times (takenDriveTimes), so this is two people booking at once. Say so on the
    // booking, so the dealer sees it before confirming.
    const clash = clashes(await drivesStore.list(), m.drive.carSlug, m.drive.startsAt, undefined, (await getSettings()).driveSlotMinutes * MINUTE);
    await drivesStore.put(clash.length ? { ...m.drive, notes: ["Clashes with another booking for this car.", m.drive.notes].filter(Boolean).join(" ") } : m.drive);
  }
  if (m.lead) {
    const id = await customerId(row);
    const known = await customersStore.get(id);
    const c: Customer = known ?? { id, name: row.name, email: row.email ?? "", phone: row.phone ?? "", source: "Website", marketingConsent: false, createdAt: row.consentAt.getTime(), lastContactAt: 0 };
    await customersStore.put({ ...c, lastContactAt: row.consentAt.getTime() });
    await notify(noticeOfLead(m.lead, Boolean(m.drive), m.drive?.id), row.consentAt.getTime());
  }
}
