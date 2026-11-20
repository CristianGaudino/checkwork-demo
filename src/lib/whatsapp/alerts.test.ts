import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const db = vi.hoisted(() => ({
  msgs: [] as Record<string, unknown>[],
  phones: [] as Record<string, unknown>[],
  team: [] as { id: string }[],
  modules: new Set<string>(),
  allowed: true,
  used: 0,
  cars: [] as Record<string, unknown>[],
  reviews: [] as Record<string, unknown>[],
}));
vi.mock("./store", () => ({
  addMessage: async (m: Record<string, unknown>) => void db.msgs.push(m),
  staffStore: { list: async () => db.phones },
  messagesStore: { list: async () => db.msgs },
  isStaffAlert: (m: { thread: string; from: string; event?: string }) => m.thread === "staff" && m.from === "site" && Boolean(m.event),
  lastWeek: () => ({ leads: 4, drives: 2, sales: 1 }),
}));
vi.mock("@/lib/integrations", () => ({ modeOf: () => "simulated" }));
vi.mock("@/lib/billing/usage", () => ({ usageAllowed: async () => db.allowed, recordUsage: async (_s: string, _k: string, n = 1) => void (db.used += n) }));
vi.mock("@/lib/modules", () => ({ enabledModules: async () => db.modules }));
vi.mock("@/lib/admin/collections", () => ({
  getSettings: async () => ({ team: db.team }),
  leadsStore: { list: async () => [] },
  salesStore: { list: async () => [] },
  drivesStore: { list: async () => [] },
  reviewsStore: { list: async () => db.reviews },
}));
vi.mock("@/lib/admin/stock-admin", () => ({ adminCars: async () => db.cars }));
vi.mock("@/lib/admin/seed-data", () => ({ carTitleOf: () => "2019 Ford Focus" }));
const { alertStaff, sendDailyAlerts } = await import("./alerts");

const phone = (id: string, o: Record<string, unknown> = {}) => ({ id, name: id, phone: "+353 83 000 0000", alerts: ["deposit", "new-in", "slow-stock", "review", "monday"], quietFrom: "", quietTo: "", ...o });
const to = () => db.msgs.map((m) => m.to);
const MONDAY_NOON = Date.parse("2026-11-16T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MONDAY_NOON); // 12:00 in Dublin
  db.msgs = [];
  db.team = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  db.phones = [phone("a"), phone("b", { quietFrom: "11:00", quietTo: "13:00" }), phone("c", { phone: "" }), phone("d", { alerts: ["enquiry"] }), phone("gone")];
  db.modules = new Set(["dashboard", "whatsapp", "sales", "social", "reviews", "margins"]);
  db.allowed = true;
  db.used = 0;
  db.cars = [];
  db.reviews = [];
});
afterEach(() => vi.useRealTimers());

describe("alertStaff", () => {
  it("reaches only people on the team, with a linked phone and the alert on, outside their quiet hours", async () => {
    expect(await alertStaff("deposit", { car: "2019 Ford Focus", eur: 1000 }, { ref: "res-1" })).toBe(1);
    expect(to()).toEqual(["a"]);
    expect(db.msgs[0]).toMatchObject({ event: "deposit", ref: "res-1", buttons: ["confirm"], text: expect.stringContaining("€1,000") });
    expect(db.used).toBe(1);
    vi.setSystemTime(Date.parse("2026-11-16T14:00:00Z")); // after b's quiet hours
    db.msgs = [];
    await alertStaff("deposit", { eur: 1000 });
    expect(to()).toEqual(["a", "b"]);
  });
  it("sends nothing without WhatsApp, or without the alert's own module", async () => {
    db.modules.delete("sales");
    expect(await alertStaff("deposit", { eur: 1000 })).toBe(0);
    db.modules = new Set(["dashboard", "sales"]);
    expect(await alertStaff("deposit", { eur: 1000 })).toBe(0);
    expect(db.msgs).toEqual([]);
  });
  it("past the cap: an alert goes by email and is not counted, the staff nudge for a new car too (it is an alert, not marketing)", async () => {
    db.allowed = false;
    await alertStaff("deposit", { eur: 1000 });
    expect(db.msgs).toEqual([expect.objectContaining({ to: "a", via: "email" })]);
    db.msgs = [];
    expect(await alertStaff("new-in", { car: "2019 Ford Focus" })).toBe(1);
    expect(db.msgs).toEqual([expect.objectContaining({ to: "a", via: "email" })]);
    expect(db.used).toBe(0);
  });
});

describe("the morning job", () => {
  it("raises a slow car and a new review once, and the summary on a Monday", async () => {
    db.cars = [
      { id: "old", listedAt: "2026-07-01", priceEur: 9000 }, // 138 days
      { id: "new", listedAt: "2026-11-01", priceEur: 9000 },
      { id: "sold", listedAt: "2026-08-01", priceEur: 9000, soldAt: "2026-11-10" },
      { id: "poa", listedAt: "2026-06-01", priceEur: 0 }, // on request: no price to drop
    ];
    db.reviews = [{ id: "r1", author: "Orla R.", rating: 5, text: "Great", createdAt: MONDAY_NOON - 3_600_000 }, { id: "r0", author: "Sean B.", rating: 4, text: "Fine", createdAt: MONDAY_NOON - 10 * 86_400_000 }];
    await sendDailyAlerts();
    expect(db.msgs.map((m) => `${m.event}:${m.ref ?? ""}`)).toEqual(["slow-stock:old", "review:r1", "monday:"]);
    expect(db.msgs[0].text).toMatch(/in stock 138 days/);
    expect(db.msgs[2].text).toMatch(/4 new leads, 2 test drives, 1 sale\./);
    vi.setSystemTime(MONDAY_NOON + 86_400_000); // Tuesday: nothing new
    await sendDailyAlerts();
    expect(db.msgs).toHaveLength(3);
  });
});
