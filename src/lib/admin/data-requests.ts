import "server-only";
import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { leads as formLeads } from "@/lib/db/schema";
import { getBindings } from "@/lib/leads/bindings";
import { alertsStore, claimsStore, customersStore, drivesStore, leadsStore, ordersStore, reservationsStore, salesStore, subscribersStore, type Claim, type Customer, type Lead, type Order, type Reservation, type Sale, type StockAlert, type Subscriber, type TestDrive } from "./collections";
import { messagesStore, type Msg } from "@/lib/whatsapp/store";
import { matchesAny, widen, type PersonQuery } from "./person-match";

// A person's right to see, and to have erased, what the dealer holds about them (GDPR articles 15 and 17), by the email or phone they
// gave. Everything personal the site keeps: the form submissions in D1 (with any trade-in photos in R2), and the dashboard's records
// (leads and their copies, test drives, stock alerts, the newsletter, the customer record). Sales and deposits keep their figures for the books, six
// years (owner's decision, 2026-11-11): erasure removes the buyer from them. Google reviews are Google's, not ours to erase.
// Owners and managers only (the "data" permission, checked by the callers).
type FormLead = typeof formLeads.$inferSelect;
export type Held = { formLeads: FormLead[]; leads: Lead[]; drives: TestDrive[]; alerts: StockAlert[]; subscribers: Subscriber[]; customers: Customer[]; sales: Sale[]; deposits: Reservation[]; claims: Claim[]; orders: Order[]; messages: Msg[] };

const hasDb = () => Boolean(getBindings().DB);

// The form submissions: every row's contact details are read (a year's worth at most, the purge sees to that) and matched here, so a phone
// written any way is found; then the matching rows in full.
async function formLeadsOf(qs: PersonQuery[]): Promise<FormLead[]> {
  if (!hasDb()) return [];
  const db = getDb();
  const all = await db.select({ id: formLeads.id, email: formLeads.email, phone: formLeads.phone }).from(formLeads);
  const ids = all.filter((r) => matchesAny(r, qs)).map((r) => r.id);
  return ids.length ? db.select().from(formLeads).where(inArray(formLeads.id, ids)) : [];
}

// By the email or phone given, then once more by the other details their customer record and leads hold, so a booking made with only a
// phone is found from their email too. Once, not over and over: a shared family phone must not pull in everyone it ever touched.
export async function findPerson(q: PersonQuery): Promise<Held> {
  const [leads, drives, alerts, subscribers, customers, sales, deposits, claims, orders, messages] = await Promise.all([leadsStore.list(), drivesStore.list(), alertsStore.list(), subscribersStore.list(), customersStore.list(), salesStore.list(), reservationsStore.list(), claimsStore.list(), ordersStore.list(), messagesStore.list()]);
  const qs = widen([q], [...customers, ...leads].filter((r) => matchesAny(r, [q])));
  const mine = customers.filter((c) => matchesAny(c, qs));
  const ids = new Set(mine.map((c) => c.id));
  const theirs = leads.filter((l) => matchesAny(l, qs));
  const leadIds = new Set(theirs.map((l) => l.id));
  return {
    formLeads: await formLeadsOf(qs),
    leads: theirs,
    messages: messages.filter((m) => m.leadId && leadIds.has(m.leadId)),
    drives: drives.filter((d) => matchesAny(d, qs)),
    alerts: alerts.filter((a) => matchesAny(a, qs)),
    subscribers: subscribers.filter((s) => matchesAny(s, qs)),
    customers: mine,
    sales: sales.filter((s) => s.customerId && ids.has(s.customerId)),
    deposits: deposits.filter((r) => r.customerId && ids.has(r.customerId)),
    claims: claims.filter((k) => k.customerId && ids.has(k.customerId)),
    orders: orders.filter((o) => o.customerId && ids.has(o.customerId)),
  };
}

export const heldCount = (h: Held) => h.formLeads.length + h.leads.length + h.drives.length + h.alerts.length + h.subscribers.length + h.customers.length + h.sales.length + h.deposits.length + h.claims.length + h.orders.length + h.messages.length;

// What they get: everything above, readable, with the photos counted (copies are sent on request: they are files, not data in this file).
export function exportOf(h: Held, at = new Date()) {
  return {
    exportedAt: at.toISOString(),
    about: "Everything this dealer's website and dashboard hold about you, found by the email or phone you gave.",
    requests: h.formLeads.map(({ photoKeys, ...r }) => ({ ...r, photos: photoKeys.length })),
    leads: h.leads,
    whatsappMessages: h.messages.map((m) => ({ at: new Date(m.at).toISOString(), from: m.from, text: m.text })),
    testDrives: h.drives,
    stockAlerts: h.alerts,
    newsletter: h.subscribers,
    customerRecords: h.customers,
    purchases: h.sales.map((s) => ({ car: s.carTitle, priceEur: s.priceEur, soldOn: s.soldOn, salesperson: s.salesperson, ...(s.returnedOn && { undoneOn: s.returnedOn, refundEur: s.refundEur, reason: s.reason }) })),
    deposits: h.deposits.map((r) => ({ car: r.carTitle, depositEur: r.depositEur, paidOn: r.paidOn, until: r.until, status: r.status, refundEur: r.refundEur })),
    factoryOrders: h.orders.map((o) => ({ car: `${o.make} ${o.model}`, spec: o.spec, regPeriod: o.regPeriod, priceEur: o.priceEur, depositEur: o.depositEur, orderedOn: o.orderedOn, status: o.status, notes: o.notes.map((n) => n.text) })),
    warrantyClaims: h.claims.map((k) => ({ car: k.carTitle, openedOn: k.openedOn, fault: k.fault, status: k.status, notes: k.notes.map((n) => n.text) })),
  };
}

// Erasure: the photos first, then the rows (if R2 fails the rows stay and the request can be run again), then the dashboard's records.
// Returns how many records went. A sale, a deposit, a factory order or a warranty claim stays, without its buyer (a claim also loses its words: the fault and
// the notes may name them), so the repair cost still counts.
export async function erasePerson(q: PersonQuery): Promise<number> {
  const h = await findPerson(q);
  if (h.formLeads.length) {
    const keys = h.formLeads.flatMap((r) => r.photoKeys);
    const bucket = getBindings().LEAD_PHOTOS;
    if (keys.length) {
      if (!bucket) throw new Error("Missing binding LEAD_PHOTOS");
      for (let i = 0; i < keys.length; i += 1000) await bucket.delete(keys.slice(i, i + 1000));
    }
    await getDb().delete(formLeads).where(inArray(formLeads.id, h.formLeads.map((r) => r.id)));
  }
  for (const m of h.messages) await messagesStore.remove(m.id);
  for (const l of h.leads) await leadsStore.remove(l.id);
  for (const d of h.drives) await drivesStore.remove(d.id);
  for (const a of h.alerts) await alertsStore.remove(a.id);
  for (const s of h.subscribers) await subscribersStore.remove(s.id);
  for (const c of h.customers) await customersStore.remove(c.id);
  for (const s of h.sales) await salesStore.put({ ...s, customerId: undefined });
  for (const r of h.deposits) await reservationsStore.put({ ...r, customerId: undefined });
  for (const k of h.claims) await claimsStore.put({ ...k, customerId: undefined, leadId: undefined, fault: "Erased on request", notes: [] });
  for (const o of h.orders) await ordersStore.put({ ...o, customerId: undefined, leadId: undefined, notes: [] });
  return heldCount(h) - h.sales.length - h.deposits.length - h.claims.length - h.orders.length;
}
