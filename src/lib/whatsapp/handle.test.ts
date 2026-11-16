import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const db = vi.hoisted(() => ({
  msgs: new Map<string, Record<string, unknown>>(),
  leads: new Map<string, Record<string, unknown>>(),
  car: {} as Record<string, unknown>,
  source: "demo",
  saved: [] as Record<string, unknown>[],
  drives: new Map<string, Record<string, unknown>>(),
  reviews: new Map<string, Record<string, unknown>>(),
  deposits: new Map<string, Record<string, unknown>>(),
  modules: new Set<string>(),
  phone: "+353 83 000 1100",
  activity: [] as string[],
}));
vi.mock("@/lib/admin/activity", () => ({ logActivity: async (_area: string, text: string) => void db.activity.push(text) }));
vi.mock("@/lib/modules", () => ({ enabledModules: async () => db.modules }));
vi.mock("@/lib/admin/activity-text", () => ({ carEditSummary: () => "Changed a car" }));
vi.mock("@/lib/admin/seed-data", () => ({ carTitleOf: () => "2019 Ford Focus" }));
vi.mock("@/lib/admin/publishers", () => ({ postReviewReply: async () => ({ ok: true }) }));
vi.mock("@/lib/admin/collections", () => ({
  leadsStore: { get: async (id: string) => db.leads.get(id), put: async (l: { id: string }) => void db.leads.set(l.id, l) },
  drivesStore: { get: async (id: string) => db.drives.get(id), put: async (d: { id: string }) => void db.drives.set(d.id, d) },
  reviewsStore: { get: async (id: string) => db.reviews.get(id), put: async (r: { id: string }) => void db.reviews.set(r.id, r) },
  reservationsStore: { get: async (id: string) => db.deposits.get(id) },
}));
vi.mock("@/lib/admin/stock-admin", () => ({ adminCar: async () => db.car, adminCars: async () => [db.car], saveCar: async (c: Record<string, unknown>) => void db.saved.push(c) }));
vi.mock("@/lib/stock-source", () => ({ stockSource: async () => db.source }));
const sent = vi.hoisted(() => [] as Record<string, unknown>[]);
vi.mock("./send", () => ({ sendWhatsApp: async (m: Record<string, unknown>, _kind: string, o?: { email?: boolean }) => (sent.push(m), { ...m, ...(o?.email && { via: "email" }) }) }));
vi.mock("@/lib/admin/notifications", () => ({ notify: async () => {} }));
vi.mock("./store", () => ({
  messagesStore: { get: async (id: string) => db.msgs.get(id), put: async (m: { id: string }) => void db.msgs.set(m.id, m), list: async () => [...db.msgs.values()] },
  staffStore: { list: async () => [{ id: "t1", name: "Aoife", phone: db.phone, alerts: [], quietFrom: "", quietTo: "" }] },
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
  db.drives.clear();
  db.reviews.clear();
  db.deposits.clear();
  db.activity.length = 0;
  db.phone = "+353 83 000 1100";
  db.modules = new Set(["dashboard", "whatsapp", "tradeIn", "testDrives", "reviews", "sales"]);
});
const said = () => [...db.msgs.values()].map((m) => String(m.text));

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

describe("an enquiry about a car that has sold since", () => {
  it("tells the buyer nothing and leaves the alert open", async () => {
    db.car = { id: "c1", slug: "audi-a3-c1", soldAt: "2026-11-01" };
    db.leads.set("real-1", { ...lead("new"), type: "enquiry", carSlug: "audi-a3-c1" });
    alert("a1", ["available"], { leadId: "real-1", event: "enquiry" });
    sent.length = 0;
    await tap("Aoife", "a1", "available");
    expect(sent).toHaveLength(0);
    expect(db.leads.get("real-1")?.status).toBe("new");
    expect([...db.msgs.values()].some((m) => String(m.text).includes("That car is sold"))).toBe(true);
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

describe("a buyer with only a phone, and more photos asked twice", () => {
  it("changes nothing on a decline the buyer cannot be told about", async () => {
    db.leads.set("real-1", { ...lead("new"), whatsappOptIn: false });
    alert("a1", ["decline"], { leadId: "real-1", event: "trade-in" });
    await tap("Aoife", "a1", "decline");
    expect(db.leads.get("real-1")?.status).toBe("new");
    expect(db.msgs.get("a1")?.done).toBeFalsy();
  });
  it("asks the buyer for more photos once, with one note", async () => {
    db.leads.set("real-1", lead("new"));
    alert("a1", ["photos"], { leadId: "real-1", event: "trade-in" });
    alert("a2", ["photos"], { leadId: "real-1", event: "trade-in" });
    sent.length = 0;
    await tap("Aoife", "a1", "photos");
    await tap("Aoife", "a2", "photos");
    expect(sent.filter((m) => m.thread === "buyer")).toHaveLength(1);
    expect((db.leads.get("real-1")?.notes as { text: string }[]).filter((n) => /more photos/.test(n.text))).toHaveLength(1);
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

describe("Confirm on a test drive booking", () => {
  it("moves the booking into the diary and tells the buyer the day and time", async () => {
    db.leads.set("real-1", { ...lead("new"), type: "test-drive", carTitle: "2019 Ford Focus" });
    db.drives.set("real-1", { id: "real-1", status: "requested", startsAt: Date.parse("2026-11-21T11:00:00Z") });
    alert("a1", ["confirm", "other"], { leadId: "real-1", ref: "real-1", event: "test-drive" });
    await tap("Aoife", "a1", "confirm");
    expect(db.drives.get("real-1")?.status).toBe("confirmed");
    expect(db.leads.get("real-1")?.status).toBe("appointment");
    expect(sent.find((m) => m.thread === "buyer")?.text).toMatch(/confirmed for 21 Nov, 11:00\. See you then/);
    expect(said().some((t) => t.includes("The booking is in the diary"))).toBe(true);
  });
});

describe("Suggest another time", () => {
  it("sends the typed time, leaves the booking and keeps the alert open", async () => {
    db.leads.set("real-1", { ...lead("new"), type: "test-drive" });
    db.drives.set("real-1", { id: "real-1", status: "requested", startsAt: 1 });
    alert("a1", ["confirm", "other"], { leadId: "real-1", ref: "real-1", event: "test-drive" });
    await tap("Aoife", "a1", "other");
    await typed("Aoife", "Saturday at 11");
    expect(sent.find((m) => m.thread === "buyer")?.text).toMatch(/could we do Saturday at 11 instead/);
    expect(db.drives.get("real-1")?.status).toBe("requested");
    expect(db.msgs.get("a1")?.done).toBeFalsy();
    expect((db.leads.get("real-1")?.notes as { text: string }[]).at(-1)?.text).toBe("Suggested another time by WhatsApp: Saturday at 11");
  });
});

describe("a typed review reply", () => {
  it("is posted and kept on the review", async () => {
    db.reviews.set("rev-1", { id: "rev-1", author: "Orla R.", rating: 5, text: "Great", createdAt: 1 });
    alert("a1", ["review"], { ref: "rev-1", event: "review" });
    await tap("Aoife", "a1", "review");
    await typed("Aoife", "Thanks Orla!");
    expect(db.reviews.get("rev-1")?.reply).toBe("Thanks Orla!");
    expect(said()).toContain("Posted on Google.");
  });
  it("is refused with Reviews off", async () => {
    db.reviews.set("rev-1", { id: "rev-1", author: "Orla R.", rating: 5, text: "Great", createdAt: 1 });
    alert("a1", ["review"], { ref: "rev-1", event: "review" });
    await tap("Aoife", "a1", "review");
    db.modules.delete("reviews");
    await typed("Aoife", "Thanks Orla!");
    expect(db.reviews.get("rev-1")?.reply).toBeUndefined();
  });
});

describe("an alert whose module is off", () => {
  it("sends no offer when Trade-in is switched off after Reply with a price", async () => {
    db.leads.set("real-1", lead("new"));
    alert("a1", ["price"], { leadId: "real-1", event: "trade-in" });
    await tap("Aoife", "a1", "price");
    db.modules.delete("tradeIn");
    await typed("Aoife", "8,500");
    expect(sent).toHaveLength(0);
    await tap("Aoife", "a1", "price");
    expect(said().at(-1)).toMatch(/is off, so I did nothing/);
  });
});

describe("someone with no linked phone", () => {
  it("is told to link it, and nothing happens", async () => {
    db.phone = "";
    db.leads.set("real-1", lead("new"));
    alert("a1", ["available"], { leadId: "real-1", event: "enquiry" });
    await tap("Aoife", "a1", "available");
    await typed("Aoife", "8,500");
    expect(sent).toHaveLength(0);
    expect(said().filter((t) => t === "Link your number below to act from here.")).toHaveLength(2);
  });
});

describe("Call back", () => {
  it("sets the follow-up to today and gives the lead to the tapper, without changing the status", async () => {
    db.leads.set("real-1", lead("new"));
    alert("a1", ["call", "handled"], { leadId: "real-1", event: "enquiry" });
    await tap("Aoife", "a1", "call");
    const l = db.leads.get("real-1") as { status: string; followUpOn: string; assignedTo: string; notes: { auto?: boolean }[] };
    expect(l.status).toBe("new");
    expect(l.followUpOn).toBe(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" }));
    expect(l.assignedTo).toBe("Aoife");
    expect(l.notes.at(-1)?.auto).toBe(true);
  });
});

describe("the channel on the note", () => {
  it("says email when the buyer was told by email", async () => {
    db.leads.set("real-1", { ...lead("new"), type: "enquiry", whatsappOptIn: false, email: "pat@example.com" });
    alert("a1", ["available"], { leadId: "real-1", event: "enquiry" });
    await tap("Aoife", "a1", "available");
    expect((db.leads.get("real-1")?.notes as { text: string }[]).at(-1)?.text).toBe("Told the buyer by email that the car is available.");
    expect(said().some((t) => t.includes("by email: yes, it's available"))).toBe(true);
  });
});

describe("Confirm on a deposit", () => {
  it("records it once while the deposit is held", async () => {
    db.deposits.set("res-1", { id: "res-1", carId: "c1", carTitle: "2019 Ford Focus", depositEur: 1000, status: "held" });
    alert("a1", ["confirm"], { ref: "res-1", event: "deposit" });
    alert("a2", ["confirm"], { ref: "res-1", event: "deposit" });
    await tap("Aoife", "a1", "confirm");
    await tap("Aoife", "a2", "confirm");
    expect(db.activity.filter((t) => t.startsWith("Confirmed the deposit"))).toHaveLength(1);
    expect(db.msgs.get("a2")?.done).toBe(true);
  });
  it("says so when the deposit has ended", async () => {
    db.deposits.set("res-1", { id: "res-1", carId: "c1", carTitle: "2019 Ford Focus", depositEur: 1000, status: "refunded" });
    alert("a1", ["confirm"], { ref: "res-1", event: "deposit" });
    await tap("Aoife", "a1", "confirm");
    expect(db.activity).toEqual([]);
    expect(said().at(-1)).toBe("That deposit is no longer held.");
  });
});
