import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const db = vi.hoisted(() => ({
  msgs: new Map<string, Record<string, unknown>>(),
  leads: new Map<string, Record<string, unknown>>(),
  car: {} as Record<string, unknown>,
  source: "demo",
  saved: [] as Record<string, unknown>[],
}));
vi.mock("@/lib/admin/activity", () => ({ logActivity: async () => {} }));
vi.mock("@/lib/admin/activity-text", () => ({ carEditSummary: () => "Changed a car" }));
vi.mock("@/lib/admin/seed-data", () => ({ carTitleOf: () => "2019 Ford Focus" }));
vi.mock("@/lib/admin/publishers", () => ({ postReviewReply: async () => ({ ok: true }) }));
vi.mock("@/lib/admin/collections", () => ({
  leadsStore: { get: async (id: string) => db.leads.get(id), put: async (l: { id: string }) => void db.leads.set(l.id, l) },
  drivesStore: { get: async () => undefined, put: async () => {} },
  reviewsStore: { get: async () => undefined, put: async () => {} },
}));
vi.mock("@/lib/admin/stock-admin", () => ({ adminCar: async () => db.car, saveCar: async (c: Record<string, unknown>) => void db.saved.push(c) }));
vi.mock("@/lib/stock-source", () => ({ stockSource: async () => db.source }));
vi.mock("./send", () => ({ sendWhatsApp: async (m: Record<string, unknown>) => m }));
vi.mock("./store", () => ({
  messagesStore: { get: async (id: string) => db.msgs.get(id), put: async (m: { id: string }) => void db.msgs.set(m.id, m), list: async () => [...db.msgs.values()] },
  staffStore: { list: async () => [{ id: "t1", name: "Aoife", phone: "+353 83 000 1100", alerts: [], quietFrom: "", quietTo: "" }] },
  addMessage: async (m: Record<string, unknown>) => {
    const msg = { id: `m${db.msgs.size}`, at: Date.now(), ...m };
    db.msgs.set(msg.id, msg);
    return msg;
  },
}));
const { tap, typed } = await import("./handle");

const lead = (status: string) => ({ id: "real-1", type: "trade-in", status, name: "Pat Byrne", email: "", phone: "", message: "", source: "Website", notes: [], createdAt: 1, whatsappOptIn: true });
const alert = (id: string, buttons: string[], extra = {}) => db.msgs.set(id, { id, at: 1, thread: "staff", from: "site", to: "Aoife", buttons, ...extra });

beforeEach(() => {
  db.msgs.clear();
  db.leads.clear();
  db.saved.length = 0;
  db.source = "demo";
  db.car = { id: "c1", priceEur: 10000 };
});

describe("Drop the price", () => {
  it("applies once, then marks the message done", async () => {
    alert("a1", ["drop"], { ref: "c1" });
    await tap("Aoife", "a1", "drop");
    expect(db.saved).toEqual([expect.objectContaining({ priceEur: 9500 })]);
    expect(db.msgs.get("a1")?.done).toBe(true);
    await tap("Aoife", "a1", "drop");
    expect(db.saved).toHaveLength(1);
  });
  it("leaves a sold car alone", async () => {
    db.car = { id: "c1", priceEur: 10000, soldAt: "2026-11-01" };
    alert("a1", ["drop"], { ref: "c1" });
    await tap("Aoife", "a1", "drop");
    expect(db.saved).toEqual([]);
  });
  it("leaves a car synced from the listing site alone", async () => {
    db.source = "donedeal";
    alert("a1", ["drop"], { ref: "c1" });
    await tap("Aoife", "a1", "drop");
    expect(db.saved).toEqual([]);
  });
});

describe("Not for us", () => {
  it("moves a lead to lost, but never reopens a won lead", async () => {
    alert("a1", ["decline"], { leadId: "real-1" });
    db.leads.set("real-1", lead("contacted"));
    await tap("Aoife", "a1", "decline");
    expect(db.leads.get("real-1")?.status).toBe("lost");
    db.leads.set("real-1", lead("won"));
    await tap("Aoife", "a1", "decline");
    expect(db.leads.get("real-1")?.status).toBe("won");
  });
});

describe("a price reply", () => {
  it("writes one offer note", async () => {
    db.leads.set("real-1", lead("new"));
    alert("q1", [], { leadId: "real-1", expects: "price" });
    await typed("Aoife", "8,500");
    const notes = (db.leads.get("real-1")?.notes as { text: string }[]).filter((n) => n.text.startsWith("Offer sent"));
    expect(notes).toHaveLength(1);
    await typed("Aoife", "9,000"); // the question is answered, so a second number is not another offer
    expect((db.leads.get("real-1")?.notes as unknown[]).length).toBe(1);
  });
});
