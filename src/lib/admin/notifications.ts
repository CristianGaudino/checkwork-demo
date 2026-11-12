import "server-only";
import { DAY, HOUR, MINUTE } from "@/lib/time";
import { LEAD_TYPE_LABELS, TEAM_SEED, demoLeads, type Lead } from "./collections";
import { defineCollection } from "./docs";
import { newId } from "./ids";

// The dashboard's own notifications: the bell. In the app only, never emailed. Each says what happened in a few words and links to it.
// Never a customer's name or details, only the kind of request and the car, so they are not personal data (nothing to erase, nothing to
// purge for privacy). `for` is a team member's name when it is theirs alone (a lead given to them); otherwise everyone sees it.
// Read is per person (their Access email, or the demo's role member), so one person reading it does not clear it for the rest.
export const NOTICE_KINDS = ["lead", "drive", "warranty", "order", "taken-down", "sync", "assigned"] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];
export type Notice = { id: string; at: number; kind: NoticeKind; text: string; href: string; for?: string; readBy: string[] };

export const NOTICE_KEEP_DAYS = 60;
const SHOWN = 20;

export const noticesStore = defineCollection<Notice>("notifications", () => seedNotices(demoLeads()));

// Who is reading, as the read marks know them.
export type Reader = { name: string; email: string };
const key = (r: Reader) => (r.email || r.name).toLowerCase();
const seesIt = (n: Notice, r: Reader) => !n.for || n.for === r.name;

// Best effort: a notification is never worth failing the thing that caused it, so callers need not catch. Old ones go as new ones come.
export async function notify(n: Omit<Notice, "id" | "at" | "readBy">, at = Date.now()): Promise<void> {
  try {
    await noticesStore.put({ id: newId("note"), at, readBy: [], ...n });
    for (const old of await noticesStore.list()) if (old.at < at - NOTICE_KEEP_DAYS * DAY) await noticesStore.remove(old.id);
  } catch {
    // shortcut: a lost notification is acceptable, the record itself is saved and shows in its list
  }
}

// The newest for this person, with how many they have not read.
export function noticesFor(all: Notice[], r: Reader): { items: (Notice & { unread: boolean })[]; unread: number } {
  const mine = all.filter((n) => seesIt(n, r)).sort((a, b) => b.at - a.at);
  const unread = mine.filter((n) => !n.readBy.includes(key(r)));
  return { items: mine.slice(0, SHOWN).map((n) => ({ ...n, unread: !n.readBy.includes(key(r)) })), unread: unread.length };
}

// Marks these (or all of this person's) as read by them.
export async function markRead(r: Reader, ids?: string[]): Promise<void> {
  for (const n of await noticesStore.list()) {
    if (!seesIt(n, r) || n.readBy.includes(key(r)) || (ids && !ids.includes(n.id))) continue;
    await noticesStore.put({ ...n, readBy: [...n.readBy, key(r)] });
  }
}

// What a website request says in the bell: the kind and the car, never the person.
export function noticeOfLead(lead: Pick<Lead, "id" | "type" | "carTitle">, drive: boolean): Omit<Notice, "id" | "at" | "readBy"> {
  if (drive) return { kind: "drive", text: `Test drive request${lead.carTitle ? `: ${lead.carTitle}` : ""}`, href: "/dashboard/test-drives" };
  const kind: NoticeKind = lead.type === "warranty" ? "warranty" : lead.type === "order" ? "order" : "lead";
  const label = lead.type === "warranty" ? "Warranty request" : lead.type === "order" ? "New car order request" : LEAD_TYPE_LABELS[lead.type];
  return { kind, text: `${label}${lead.carTitle ? `: ${lead.carTitle}` : ""}`, href: `/dashboard/leads/${lead.id}` };
}

// The demo's bell: the seeded website requests of the last three days (the day's own unread), today's test drive requests, and a lead
// given to Conor. Older ones read by the whole team.
function seedNotices(leads: Lead[], now = Date.now()): Notice[] {
  const team = TEAM_SEED.map((t) => t.email);
  const recent = leads.filter((l) => l.source === "Website" && l.createdAt > now - 3 * DAY);
  const out: Notice[] = recent.map((l) => ({ id: `note-${l.id}`, at: l.createdAt, ...noticeOfLead(l, l.type === "test-drive"), readBy: l.createdAt < now - DAY ? team : [] }));
  out.push(
    { id: "note-drive-today", at: now - 2 * HOUR, kind: "drive", text: "Test drive request: today, 17:00", href: "/dashboard/test-drives", readBy: [] },
    { id: "note-assigned", at: now - 35 * MINUTE, kind: "assigned", text: "Ciara Walsh gave you a lead: Car enquiry", href: "/dashboard/leads?status=contacted", for: "Conor Doyle", readBy: [] },
  );
  return out;
}
