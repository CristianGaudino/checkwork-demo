import type { Customer, StockAlert, Subscriber } from "./collections";

// The Customers page's three lists as searched and filtered from the URL. The page and the CSV export both read these, so the export is
// the list as it is shown. Unknown values match nothing they should not: an unknown source or kind simply finds no row.
export type ListParams = { q?: string; source?: string; consent?: string; kind?: string; state?: string };
const query = (sp: ListParams) => (sp.q ?? "").trim().toLowerCase().slice(0, 60);
// A name, an email, a phone or a car that contains what was typed (in lower case).
const has = (q: string, ...fields: (string | undefined)[]) => !q || fields.some((f) => f?.toLowerCase().includes(q));

export const filterCustomers = (rows: Customer[], sp: ListParams) =>
  rows.filter((c) => has(query(sp), c.name, c.email, c.phone) && (!sp.source || c.source === sp.source) && (!sp.consent || String(c.marketingConsent) === sp.consent));
export const filterAlerts = (rows: StockAlert[], sp: ListParams) =>
  rows.filter((a) => has(query(sp), a.email, a.criteria) && (!sp.kind || a.kind === sp.kind) && (!sp.state || (sp.state === "active") === a.active));
export const filterSubscribers = (rows: Subscriber[], sp: ListParams) => rows.filter((s) => has(query(sp), s.email) && (!sp.state || s.status === sp.state));
