import { describe, expect, it } from "vitest";
import type { Customer, StockAlert, Subscriber } from "./collections";
import { filterAlerts, filterCustomers, filterSubscribers } from "./customer-lists";

const people = [
  { id: "1", name: "Aoife Byrne", email: "aoife@x.ie", phone: "087 1", source: "Website", marketingConsent: true },
  { id: "2", name: "Conor Hayes", email: "conor@x.ie", phone: "086 2", source: "Phone", marketingConsent: false },
] as unknown as Customer[];
const alerts = [
  { id: "a", email: "a@x.ie", criteria: "Ford Focus", kind: "price-drop", active: true, createdAt: 1 },
  { id: "b", email: "b@x.ie", criteria: "Kia", kind: "back-in-stock", active: false, createdAt: 2 },
] as StockAlert[];
const subs = [{ id: "s", email: "s@x.ie", status: "subscribed" }, { id: "t", email: "t@x.ie", status: "unsubscribed" }] as unknown as Subscriber[];
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe("the customer lists, as the page and its export filter them", () => {
  it("customers: search on name, email or phone; source and marketing consent", () => {
    expect(ids(filterCustomers(people, {}))).toEqual(["1", "2"]);
    expect(ids(filterCustomers(people, { q: " CONOR " }))).toEqual(["2"]);
    expect(ids(filterCustomers(people, { q: "087" }))).toEqual(["1"]);
    expect(ids(filterCustomers(people, { source: "Phone" }))).toEqual(["2"]);
    expect(ids(filterCustomers(people, { consent: "true" }))).toEqual(["1"]);
    expect(filterCustomers(people, { source: "Nowhere" })).toEqual([]);
  });
  it("stock alerts: search on email or car, the kind, active or paused", () => {
    expect(ids(filterAlerts(alerts, { q: "focus" }))).toEqual(["a"]);
    expect(ids(filterAlerts(alerts, { kind: "back-in-stock" }))).toEqual(["b"]);
    expect(ids(filterAlerts(alerts, { state: "active" }))).toEqual(["a"]);
    expect(ids(filterAlerts(alerts, { state: "paused" }))).toEqual(["b"]);
  });
  it("subscribers: search on email and the status", () => {
    expect(ids(filterSubscribers(subs, { q: "t@" }))).toEqual(["t"]);
    expect(ids(filterSubscribers(subs, { state: "subscribed" }))).toEqual(["s"]);
  });
});
