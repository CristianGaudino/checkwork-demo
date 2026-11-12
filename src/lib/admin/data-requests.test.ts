import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { exportOf, erasePerson, findPerson, heldCount } = await import("./data-requests");
const { alertsStore, claimsStore, customersStore, drivesStore, leadsStore, reservationsStore, salesStore, subscribersStore } = await import("./collections");
const { parsePersonQuery } = await import("./person-match");

// The memory path (no D1): the dashboard's records. The D1 form submissions are the same match, read from the table.
describe("a data request", () => {
  it("finds everything held about a person by email or phone, exports it, and erases it, keeping their purchase without them", async () => {
    const now = Date.now();
    await customersStore.put({ id: "cust-x", name: "Pat Byrne", email: "pat@example.com", phone: "087 123 4567", source: "Sale", marketingConsent: false, createdAt: now, lastContactAt: now });
    await leadsStore.put({ id: "lead-x", type: "enquiry", status: "new", name: "Pat Byrne", email: "PAT@example.com", phone: "", message: "Hi", source: "Website", notes: [], createdAt: now });
    await drivesStore.put({ id: "drive-x", name: "Pat", email: "", phone: "+353 87 123 4567", carSlug: "x", carTitle: "2016 Ford Focus", startsAt: now, status: "confirmed", notes: "", createdAt: now });
    await alertsStore.put({ id: "alert-x", email: "pat@example.com", kind: "price-drop", criteria: "Ford Focus", active: true, createdAt: now });
    await subscribersStore.put({ id: "sub-x", email: "pat@example.com", status: "subscribed", createdAt: now });
    await salesStore.put({ id: "car-x", carTitle: "2016 Ford Focus", priceEur: 9000, soldOn: "2026-11-01", customerId: "cust-x", createdAt: now });
    await reservationsStore.put({ id: "res-x", carId: "car-y", carTitle: "2018 Kia Rio", customerId: "cust-x", depositEur: 500, method: "Card", paidOn: "2026-10-01", until: "2026-10-10", status: "refunded", refundEur: 500, createdAt: now });
    await claimsStore.put({ id: "claim-x", saleId: "car-x", carId: "car-x", carTitle: "2016 Ford Focus", customerId: "cust-x", openedOn: "2026-11-05", fault: "Pat says the clutch slips", inCover: true, status: "open", costEur: 300, notes: [{ at: now, text: "Call Pat back" }], createdAt: now });
    const others = (await leadsStore.list()).length - 1;

    const byEmail = await findPerson(parsePersonQuery("pat@example.com")!);
    expect([byEmail.customers, byEmail.leads, byEmail.alerts, byEmail.subscribers, byEmail.sales, byEmail.drives, byEmail.deposits, byEmail.claims].map((x) => x.length)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    // The booking gave only a phone: found through the phone on their customer record. And the other way round.
    const byPhone = await findPerson(parsePersonQuery("0871234567")!);
    expect(heldCount(byPhone)).toBe(heldCount(byEmail));
    expect(heldCount(byEmail)).toBe(8);
    expect(JSON.stringify(exportOf(byEmail).purchases)).not.toContain("cust-x");
    expect(exportOf(byEmail).deposits).toEqual([{ car: "2018 Kia Rio", depositEur: 500, paidOn: "2026-10-01", until: "2026-10-10", status: "refunded", refundEur: 500 }]);

    expect(await erasePerson(parsePersonQuery("pat@example.com")!)).toBe(5); // the sale and the deposit are kept, so not counted
    expect(await reservationsStore.get("res-x")).toMatchObject({ depositEur: 500, customerId: undefined });
    expect(await claimsStore.get("claim-x")).toMatchObject({ costEur: 300, customerId: undefined, fault: "Erased on request", notes: [] });
    expect(await customersStore.get("cust-x")).toBeUndefined();
    expect(await leadsStore.get("lead-x")).toBeUndefined();
    expect(await alertsStore.get("alert-x")).toBeUndefined();
    expect(await subscribersStore.get("sub-x")).toBeUndefined();
    expect(await salesStore.get("car-x")).toMatchObject({ priceEur: 9000, customerId: undefined });
    expect(await drivesStore.get("drive-x")).toBeUndefined();
    expect((await leadsStore.list()).length).toBe(others); // nobody else touched
  });
});
