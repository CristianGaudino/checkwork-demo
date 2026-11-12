import "server-only";
import { DAY, MINUTE } from "@/lib/time";
import { LEAD_TYPE_LABELS, TEAM_SEED, demoDrives, demoLeads, type Lead } from "./collections";
import { defineCollection } from "./docs";
import { newId } from "./ids";

// The dashboard's own notifications: the bell. In the app only, never emailed. Each says what happened in a few words and links to it.
// Never a customer's name or details, only the kind of request and the car, so they are not personal data (nothing to erase, nothing to
// purge for privacy). `for` is a team member's name when it is theirs alone (a lead given to them); otherwise everyone sees it.
export const NOTICE_KINDS = ["lead", "drive", "warranty", "order", "taken-down", "sync", "assigned"] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];
export type Notice = { id: string; at: number; kind: NoticeKind; text: string; href: string; for?: string };
// What one person has read: a record each (by their key), so two people reading at once never write the same record.
export type Reads = { id: string; ids: string[] };

export const NOTICE_KEEP_DAYS = 60;
const SHOWN = 20;

export const noticesStore = defineCollection<Notice>("notifications", () => seedNotices(demoLeads()));
// The demo team has read the seeded notices older than a day, so the bell opens on the day's own.
export const readsStore = defineCollection<Reads>("notice-reads", () => {
  const old = seedNotices(demoLeads()).filter((n) => n.at < Date.now() - DAY).map((n) => n.id);
  return TEAM_SEED.map((t) => ({ id: t.email, ids: old }));
});

// Who is reading, as the read marks know them: their Access email, or the demo's role member.
export type Reader = { name: string; email: string };
const key = (r: Reader) => (r.email || r.name).toLowerCase();
const seesIt = (n: Notice, r: Reader) => !n.for || n.for === r.name;
export const readsOf = async (r: Reader) => new Set((await readsStore.get(key(r)))?.ids ?? []);

// Best effort: a notification is never worth failing the thing that caused it, so callers need not catch. Old ones go as new ones come.
export async function notify(n: Omit<Notice, "id" | "at">, at = Date.now()): Promise<void> {
  try {
    await noticesStore.put({ id: newId("note"), at, ...n });
    for (const old of await noticesStore.list()) if (old.at < at - NOTICE_KEEP_DAYS * DAY) await noticesStore.remove(old.id);
  } catch {
    // shortcut: a lost notification is acceptable, the record itself is saved and shows in its list
  }
}

// The newest for this person, with how many they have not read (`read`: the ids they have).
export function noticesFor(all: Notice[], read: Set<string>, r: Reader): { items: (Notice & { unread: boolean })[]; unread: number } {
  const mine = all.filter((n) => seesIt(n, r)).sort((a, b) => b.at - a.at);
  return { items: mine.slice(0, SHOWN).map((n) => ({ ...n, unread: !read.has(n.id) })), unread: mine.filter((n) => !read.has(n.id)).length };
}

// Marks these (or all of this person's) as read, in their own record. Ids of notices that have gone are dropped, so it never grows past
// what the bell holds.
export async function markRead(r: Reader, ids?: string[]): Promise<void> {
  const all = await noticesStore.list();
  const live = new Set(all.map((n) => n.id));
  const read = await readsOf(r);
  const add = all.filter((n) => seesIt(n, r) && (!ids || ids.includes(n.id))).map((n) => n.id);
  await readsStore.put({ id: key(r), ids: [...new Set([...read, ...add])].filter((id) => live.has(id)) });
}

// What a website request says in the bell: the kind and the car, never the person.
export function noticeOfLead(lead: Pick<Lead, "id" | "type" | "carTitle">, drive: boolean): Omit<Notice, "id" | "at"> {
  if (drive) return { kind: "drive", text: `Test drive request${lead.carTitle ? `: ${lead.carTitle}` : ""}`, href: "/dashboard/test-drives" };
  const kind: NoticeKind = lead.type === "warranty" ? "warranty" : lead.type === "order" ? "order" : "lead";
  const label = lead.type === "warranty" ? "Warranty request" : lead.type === "order" ? "New car order request" : LEAD_TYPE_LABELS[lead.type];
  return { kind, text: `${label}${lead.carTitle ? `: ${lead.carTitle}` : ""}`, href: `/dashboard/leads/${lead.id}` };
}

// The demo's bell: the seeded website requests of the last three days, the test drive requests booked today and tomorrow, and a lead given
// to Conor. Worded as real ones are, never with a day ("today"), so they stay true for as long as they are kept.
function seedNotices(leads: Lead[], now = Date.now()): Notice[] {
  const recent = leads.filter((l) => l.source === "Website" && l.createdAt > now - 3 * DAY);
  const drives = demoDrives().filter((d) => d.status === "requested" && d.startsAt > now && d.createdAt > now - 3 * DAY);
  return [
    ...recent.map((l) => ({ id: `note-${l.id}`, at: l.createdAt, ...noticeOfLead(l, l.type === "test-drive") })),
    ...drives.map((d) => ({ id: `note-${d.id}`, at: d.createdAt, ...noticeOfLead({ id: d.id, type: "test-drive", carTitle: d.carTitle }, true) })),
    { id: "note-assigned", at: now - 35 * MINUTE, kind: "assigned", text: "Ciara Walsh gave you a lead: Car enquiry", href: "/dashboard/leads?status=contacted", for: "Conor Doyle" },
  ];
}
