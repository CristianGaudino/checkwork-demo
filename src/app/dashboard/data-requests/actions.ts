"use server";

import { redirect } from "next/navigation";
import { logActivity } from "@/lib/admin/activity";
import { erasePerson, exportOf, findPerson, heldCount } from "@/lib/admin/data-requests";
import { LEAD_TYPE_LABELS } from "@/lib/admin/collections";
import { fmtDate } from "@/lib/admin/format";
import { TYPE_LABELS } from "@/lib/leads/schema";
import { parsePersonQuery } from "@/lib/admin/person-match";
import { can } from "@/lib/permissions";
import { requireStaff } from "@/lib/staff";

// Erasure on request: owners and managers, once they have ticked that they checked it is the person asking. Recorded in the activity
// history without the person (the record is the point of the request). The query never goes into the address after this, so no email or
// phone sits in the browser history or the logs.
export async function eraseAction(data: FormData) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  if (!(await can("data"))) return;
  const q = parsePersonQuery(String(data.get("q") ?? ""));
  if (!q || data.get("checked") !== "on") redirect("/dashboard/data-requests?notice=confirm");
  const n = await erasePerson(q);
  await logActivity("customers", `Erased a person's data on request (${n === 1 ? "1 record" : `${n} records`})`);
  redirect(`/dashboard/data-requests?erased=${n}`);
}

// The search: what is held about this person, in words, for the page to show before an export or an erasure.
export type FindState = { q?: string; error?: string; groups?: { label: string; items: string[] }[]; total?: number } | undefined;
export async function findAction(_prev: FindState, data: FormData): Promise<FindState> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  if (!(await can("data"))) return { error: "Only an owner or manager can do this" };
  const raw = String(data.get("q") ?? "").trim().slice(0, 200);
  const q = parsePersonQuery(raw);
  if (!q) return { q: raw, error: "Enter the email or phone number they gave us" };
  const h = await findPerson(q);
  const day = (t: number | Date | string) => fmtDate(typeof t === "string" ? `${t}T12:00:00Z` : t instanceof Date ? t.getTime() : t);
  const groups = [
    { label: "Requests sent from the website", items: h.formLeads.map((r) => `${TYPE_LABELS[r.type]}, ${day(r.createdAt)}${r.photoKeys.length ? `, ${r.photoKeys.length} photos` : ""}`) },
    // With the name, so staff can spot a record of someone else's found through a shared phone or email before erasing.
    { label: "Leads", items: h.leads.map((l) => `${l.name}, ${LEAD_TYPE_LABELS[l.type]}, ${day(l.createdAt)}`) },
    { label: "WhatsApp messages", items: h.messages.map((m) => `${m.from === "buyer" ? "From the buyer" : "To the buyer"}, ${day(m.at)}`) },
    { label: "Test drives", items: h.drives.map((d) => `${d.name}, ${d.carTitle}, ${day(d.startsAt)}`) },
    { label: "Stock alerts", items: h.alerts.map((a) => `${a.criteria}${a.active ? "" : ", paused"}`) },
    { label: "Newsletter", items: h.subscribers.map((s) => (s.status === "subscribed" ? "Subscribed" : "Unsubscribed")) },
    { label: "Customer record", items: h.customers.map((c) => `${c.name}, since ${day(c.createdAt)}`) },
    { label: "Purchases", items: h.sales.map((s) => `${s.carTitle}, ${day(s.soldOn)}${s.returnedOn ? `, undone ${day(s.returnedOn)}` : ""}`) },
    { label: "Deposits", items: h.deposits.map((r) => `${r.carTitle}, ${day(r.paidOn)}`) },
    { label: "Factory orders", items: h.orders.map((o) => `${o.regPeriod} ${o.make} ${o.model}, ${day(o.orderedOn)}`) },
    { label: "Warranty claims", items: h.claims.map((k) => `${k.carTitle}, ${day(k.openedOn)}`) },
  ].filter((g) => g.items.length);
  return { q: raw, groups, total: heldCount(h) };
}

// A copy of everything held about one person, to send them (GDPR article 15): the page saves it as a JSON file. Recorded in the activity
// history without the person.
export async function exportAction(raw: string): Promise<{ name: string; json: string } | null> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  if (!(await can("data"))) return null;
  const q = parsePersonQuery(raw);
  if (!q) return null;
  const held = exportOf(await findPerson(q));
  await logActivity("customers", "Exported a person's data on request");
  return { name: `data-request-${held.exportedAt.slice(0, 10)}.json`, json: JSON.stringify(held, null, 2) };
}
