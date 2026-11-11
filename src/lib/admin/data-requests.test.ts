import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { exportOf, erasePerson, findPerson, heldCount } = await import("./data-requests");
const { alertsStore, customersStore, drivesStore, leadsStore, salesStore, subscribersStore } = await import("./collections");
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
    const others = (await leadsStore.list()).length - 1;

    const byEmail = await findPerson(parsePersonQuery("pat@example.com")!);
    expect([byEmail.customers, byEmail.leads, byEmail.alerts, byEmail.subscribers, byEmail.sales, byEmail.drives].map((x) => x.length)).toEqual([1, 1, 1, 1, 1, 1]);
    // The booking gave only a phone: found through the phone on their customer record. And the other way round.
    const byPhone = await findPerson(parsePersonQuery("0871234567")!);
    expect(heldCount(byPhone)).toBe(heldCount(byEmail));
    expect(heldCount(byEmail)).toBe(6);
    expect(JSON.stringify(exportOf(byEmail).purchases)).not.toContain("cust-x");

    expect(await erasePerson(parsePersonQuery("pat@example.com")!)).toBe(5); // the sale is kept, so not counted
    expect(await customersStore.get("cust-x")).toBeUndefined();
    expect(await leadsStore.get("lead-x")).toBeUndefined();
    expect(await alertsStore.get("alert-x")).toBeUndefined();
    expect(await subscribersStore.get("sub-x")).toBeUndefined();
    expect(await salesStore.get("car-x")).toMatchObject({ priceEur: 9000, customerId: undefined });
    expect(await drivesStore.get("drive-x")).toBeUndefined();
    expect((await leadsStore.list()).length).toBe(others); // nobody else touched
  });
});
