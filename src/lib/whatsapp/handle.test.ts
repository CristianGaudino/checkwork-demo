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
const sent = vi.hoisted(() => [] as Record<string, unknown>[]);
vi.mock("./send", () => ({ sendWhatsApp: async (m: Record<string, unknown>) => (sent.push(m), m) }));
vi.mock("@/lib/admin/notifications", () => ({ notify: async () => {} }));
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

const lead = (status: string) => ({ id: "real-1", type: "trade-in", status, name: "Pat Byrne", email: "", phone: "+353 87 000 0000", message: "", source: "Website", notes: [], createdAt: 1, whatsappOptIn: true });
const alert = (id: string, buttons: string[], extra = {}) => db.msgs.set(id, { id, at: 1, thread: "staff", from: "site", to: "Aoife", buttons, ...extra });

beforeEach(() => {
  db.msgs.clear();
  db.leads.clear();
  db.saved.length = 0;
  sent.length = 0;
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
  it("applies once for all the copies of one alert", async () => {
    alert("a1", ["drop"], { ref: "c1", event: "slow-stock" });
    alert("a2", ["drop"], { ref: "c1", event: "slow-stock", to: "Sean" });
    await tap("Aoife", "a1", "drop");
    await tap("Aoife", "a2", "drop");
    expect(db.saved).toHaveLength(1);
    expect(db.msgs.get("a2")?.done).toBe(true);
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

describe("a lead button on two copies of one alert", () => {
  it("writes to the buyer once", async () => {
    db.leads.set("real-1", lead("new"));
    alert("a1", ["available"], { leadId: "real-1", event: "enquiry" });
    alert("a2", ["available"], { leadId: "real-1", event: "enquiry" });
    await tap("Aoife", "a1", "available");
    await tap("Aoife", "a2", "available");
    expect(sent).toHaveLength(1);
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
    alert("q1", [], { leadId: "real-1", expects: "price", at: Date.now() - 1000 });
    await typed("Aoife", "8,500");
    const notes = (db.leads.get("real-1")?.notes as { text: string }[]).filter((n) => n.text.startsWith("Offer sent"));
    expect(notes).toHaveLength(1);
    await typed("Aoife", "9,000"); // the question is answered, so a second number is not another offer
    expect((db.leads.get("real-1")?.notes as unknown[]).length).toBe(2); // the offer, and the buyer's answer
  });
});

describe("asking for more photos, then making an offer", () => {
  it("sends the offer after the photos, then no second offer from another copy", async () => {
    db.leads.set("real-1", lead("new"));
    alert("a1", ["photos", "price"], { leadId: "real-1", event: "trade-in" });
    alert("a2", ["photos", "price"], { leadId: "real-1", event: "trade-in" });
    await tap("Aoife", "a1", "photos");
    sent.length = 0;
    await tap("Aoife", "a1", "price");
    await typed("Aoife", "8,500");
    expect(sent.some((m) => String(m.text).includes("8,500"))).toBe(true);
    sent.length = 0;
    await tap("Aoife", "a2", "price");
    await typed("Aoife", "9,000");
    expect(sent.some((m) => String(m.text).includes("9,000"))).toBe(false);
  });
});

describe("a buyer who can be reached neither way", () => {
  it("gets nothing sent, the lead is left as it was, and the dealer is told to call", async () => {
    db.leads.set("real-1", { ...lead("new"), whatsappOptIn: false, email: "", phone: "+353 87 000 0001" });
    alert("a1", ["price"], { leadId: "real-1", event: "trade-in" });
    await tap("Aoife", "a1", "price");
    sent.length = 0;
    await typed("Aoife", "8,500");
    expect(sent).toHaveLength(0);
    expect(db.leads.get("real-1")?.status).toBe("new");
    expect([...db.msgs.values()].some((m) => String(m.text).includes("Call them on +353 87 000 0001"))).toBe(true);
  });
});

describe("two people asked to reply to one alert", () => {
  it("sends the first offer only, and tells the second it is done", async () => {
    db.leads.set("real-1", lead("new"));
    alert("a1", ["price"], { leadId: "real-1", event: "trade-in" });
    alert("a2", ["price"], { leadId: "real-1", event: "trade-in" });
    await tap("Aoife", "a1", "price");
    await tap("Aoife", "a2", "price"); // both questions are open before either is answered
    sent.length = 0;
    await typed("Aoife", "8,500");
    await typed("Aoife", "9,000");
    expect(sent.filter((m) => /€/.test(String(m.text)))).toHaveLength(1);
  });
});

describe("a closed lead and an old question", () => {
  it("sends no offer after the lead was declined from the other copy", async () => {
    db.leads.set("real-1", lead("contacted"));
    alert("a1", ["decline"], { leadId: "real-1", event: "trade-in" });
    alert("a2", ["price"], { leadId: "real-1", event: "trade-in", to: "Aoife" });
    await tap("Aoife", "a1", "decline");
    sent.length = 0;
    await tap("Aoife", "a2", "price");
    expect(db.msgs.get("a2")?.done).toBe(true);
    await typed("Aoife", "8,500");
    expect(sent).toHaveLength(0);
  });
  it("sends no offer when the lead closes after the question", async () => {
    db.leads.set("real-1", lead("lost"));
    alert("q1", [], { leadId: "real-1", expects: "price", at: Date.now() - 1000 });
    await typed("Aoife", "8,500");
    expect(sent).toHaveLength(0);
  });
  it("ignores a question asked over an hour ago", async () => {
    db.leads.set("real-1", lead("new"));
    alert("q1", [], { leadId: "real-1", expects: "price", at: Date.now() - 2 * 3600_000 });
    await typed("Aoife", "8,500");
    expect(sent).toHaveLength(0);
  });
});
