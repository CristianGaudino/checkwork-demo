import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { mirrorLead, mirrorOf } = await import("./real-leads");
const { dublinMs } = await import("./format");
const { drivesStore } = await import("./collections");
import type { LeadRow } from "@/lib/leads/process";

const row = (over: Partial<LeadRow>): LeadRow => ({ id: "abc", clientRef: "r", type: "enquiry", carId: "1", carSlug: "x-1", carTitle: "2020 Audi A3", carPriceEur: 10000, sourcePath: "/", name: "Pat", phone: null, email: "pat@example.com", message: "Hello", details: {}, photoKeys: [], consentAt: new Date("2026-11-10T10:00:00Z"), consentVersion: "v", ...over });

describe("dublinMs", () => {
  it("reads a time as Irish time: winter is UTC, summer is an hour earlier", () => {
    expect(new Date(dublinMs("2026-01-15", "10:00")).toISOString()).toBe("2026-01-15T10:00:00.000Z");
    expect(new Date(dublinMs("2026-07-15", "10:00")).toISOString()).toBe("2026-07-15T09:00:00.000Z");
  });
});

describe("mirrorOf", () => {
  it("makes a lead with the visitor's words and marks it as real", () => {
    const m = mirrorOf(row({}));
    expect(m.lead).toMatchObject({ id: "real-abc", type: "enquiry", status: "new", message: "Hello", carTitle: "2020 Audi A3", source: "Website" });
    expect(m.drive).toBeUndefined();
  });
  it("makes a booking and a lead from a test drive", () => {
    const m = mirrorOf(row({ type: "test_drive", message: null, details: { driveDate: "2026-11-12", driveTime: "10:30" } }));
    expect(m.drive).toMatchObject({ id: "real-abc", status: "requested", carSlug: "x-1" });
    expect(new Date(m.drive!.startsAt).toISOString()).toBe("2026-11-12T10:30:00.000Z");
    expect(m.lead).toMatchObject({ type: "test-drive", message: "Test drive on 2026-11-12 at 10:30." });
  });
  it("makes an alert, not a lead, from an alert sign-up", () => {
    const m = mirrorOf(row({ type: "alert", name: "Stock alert", details: { alertKind: "price-drop" } }));
    expect(m.lead).toBeUndefined();
    expect(m.alert).toMatchObject({ id: "real-abc", kind: "price-drop", email: "pat@example.com", criteria: "2020 Audi A3", active: true });
  });
  it("keeps the photos and says so when the email to the dealer failed", () => {
    const m = mirrorOf(row({ type: "trade_in", photoKeys: ["trade-in/abc/1.jpg"] }), false);
    expect(m.lead).toMatchObject({ photoKeys: ["trade-in/abc/1.jpg"], notes: [{ text: expect.stringMatching(/didn't reach you/) }] });
    expect(mirrorOf(row({})).lead!.notes).toEqual([]);
  });
  it("files a message from the Warranty or Service page under that type", () => {
    expect(mirrorOf(row({ type: "general", carId: null, sourcePath: "/warranty" })).lead?.type).toBe("warranty");
    expect(mirrorOf(row({ type: "general", carId: null, sourcePath: "/service" })).lead?.type).toBe("service");
    expect(mirrorOf(row({ type: "general", carId: null, sourcePath: "/contact" })).lead?.type).toBe("general");
  });
  it("keeps the answers with the words: a factory order says the car", () => {
    expect(mirrorOf(row({ type: "order", carId: null, message: "White please", details: { make: "Kia", model: "Sportage", regPeriod: "271" } })).lead).toMatchObject({ type: "order", message: "Make: Kia. Model: Sportage. Registration period: 271\n\nWhite please" });
  });
  it("describes a form with no free text from its answers", () => {
    const m = mirrorOf(row({ type: "finance", message: null, details: { deposit: 2000, term: 48 } }));
    expect(m.lead!.message).toBe("Deposit: 2000. Term (months): 48");
  });
});

describe("mirrorLead", () => {
  it("notes a clash when the same car is already booked at that time", async () => {
    const booking = (id: string) => row({ id, type: "test_drive", message: null, carSlug: "clash-car-1", details: { driveDate: "2030-01-15", driveTime: "10:00" } });
    await mirrorLead(booking("first"));
    await mirrorLead(booking("second"));
    expect((await drivesStore.get("real-first"))?.notes).toBe("");
    expect((await drivesStore.get("real-second"))?.notes).toMatch(/Clashes with another booking/);
  });
});
