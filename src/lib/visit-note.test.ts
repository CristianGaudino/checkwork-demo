import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { journeySchema } from "@/lib/leads/journey";
import { DEFAULT_QUERY } from "@/lib/stock/query";
import type { StockQuery } from "@/lib/stock/types";
import { JOURNEY_CAPS, NOTE_KEY, journeyOf, noteCar, noteCount, noteFinance, noteSearch, noteTradeIn, readNote, searchOf, sharedLines, startNote } from "./visit-note";

let data: Map<string, string>;
let events: number;
beforeEach(() => {
  data = new Map();
  events = 0;
  vi.stubGlobal("sessionStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) });
  vi.stubGlobal("dispatchEvent", () => void events++);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const q = (over: Partial<StockQuery>): StockQuery => ({ ...DEFAULT_QUERY, ...over });
const journey = () => journeyOf(readNote());

describe("the visit note", () => {
  it("is nothing to share until something is noted, and then a contract-valid journey", () => {
    startNote();
    expect(journey()).toBeNull();
    noteCar("4710001");
    const j = journey()!;
    expect(journeySchema.parse(j)).toEqual(j);
    expect(j).toMatchObject({ v: 1, minutes: 0, cars: [{ id: "4710001", views: 1 }], searches: [], tools: {} });
    expect(events).toBeGreaterThan(0);
  });

  it("keeps the most viewed cars first, at most 12, views capped at 99, and never a malformed id", () => {
    for (let i = 0; i < 120; i++) noteCar("100");
    for (let i = 1; i <= 14; i++) noteCar(String(200 + i));
    noteCar("../admin");
    noteCar("1".repeat(13));
    const cars = journey()!.cars;
    expect(cars).toHaveLength(JOURNEY_CAPS.cars);
    expect(cars[0]).toEqual({ id: "100", views: 99 });
    expect(cars.map((c) => c.id)).not.toContain("201"); // the oldest of the one-view cars went
    expect(cars.map((c) => c.id)).toContain("214");
  });

  it("notes searches as fixed values only: never the search box, the first of each filter, latest first, each once, at most 8", () => {
    expect(searchOf(q({ q: "my name is Ann 087 1234567" }))).toBeNull();
    expect(searchOf(q({ make: ["Audi <script>"], fuel: ["petrol" as never, "jet" as never] }))).toEqual({ fuel: "petrol", condition: "used" });
    expect(searchOf(q({ make: ["audi", "bmw"], model: ["a3"], body: ["hatchback"], gearbox: "automatic", priceMax: 20000, condition: "new" }))).toEqual({
      make: "audi",
      model: "a3",
      body: "hatchback",
      gearbox: "automatic",
      priceBand: "10k-20k",
      condition: "new",
    });
    noteSearch(q({ make: ["audi"] }));
    noteSearch(q({ make: ["audi"], page: 2, sort: "price-asc" })); // the same search again
    noteSearch(q({ q: "free text only" }));
    expect(journey()!.searches).toEqual([{ make: "audi", condition: "used" }]);
    for (let i = 0; i < 10; i++) noteSearch(q({ make: [`make-${i}`] }));
    const searches = journey()!.searches;
    expect(searches).toHaveLength(JOURNEY_CAPS.searches);
    expect(searches[0].make).toBe("make-9");
    expect(JSON.stringify(journey())).not.toContain("free text");
  });

  it("caps the tools and the minutes, and the result still passes the contract", () => {
    vi.useFakeTimers({ now: Date.parse("2026-11-22T10:00:00Z") });
    startNote();
    noteFinance(303.5);
    noteFinance(undefined); // a figure that could not be worked out keeps the last one shown
    expect(journey()!.tools.finance).toEqual({ monthlyEur: 304 });
    noteFinance(99999);
    noteTradeIn();
    noteCount("saved", 150);
    noteCount("compared", 1);
    noteCount("compared", 0);
    vi.setSystemTime(Date.parse("2026-11-22T19:00:00Z"));
    const j = journey()!;
    expect(j.minutes).toBe(JOURNEY_CAPS.minutes);
    expect(j.tools).toEqual({ finance: { monthlyEur: 5000 }, tradeIn: true, saved: 99 });
    expect(journeySchema.parse(j)).toEqual(j);
    expect(new TextEncoder().encode(JSON.stringify(j)).length).toBeLessThanOrEqual(JOURNEY_CAPS.bytes);
  });

  it("a full note stays under 4 KB", () => {
    for (let i = 0; i < 20; i++) noteCar(String(100000000000 + i));
    for (let i = 0; i < 20; i++) noteSearch(q({ make: ["m".repeat(39) + (i % 10)], model: ["x".repeat(40)], body: ["b".repeat(40)], fuel: ["plug-in-hybrid"], gearbox: "automatic", priceMin: 60000 }));
    noteFinance(5000);
    noteTradeIn();
    noteCount("saved", 1);
    noteCount("compared", 1);
    const j = journey()!;
    expect(journeySchema.parse(j)).toEqual(j);
    expect(new TextEncoder().encode(JSON.stringify(j)).length).toBeLessThanOrEqual(JOURNEY_CAPS.bytes);
  });

  it("writes nothing, and never throws, when storage is blocked", () => {
    const blocked = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    vi.stubGlobal("sessionStorage", { getItem: blocked, setItem: blocked, removeItem: blocked });
    expect(() => (startNote(), noteCar("1"), noteSearch(q({ make: ["audi"] })), noteFinance(100), noteTradeIn(), noteCount("saved", 1))).not.toThrow();
    expect(readNote()).toBeNull();
    expect(journey()).toBeNull();
    expect(events).toBe(0);
  });

  it("an edited note is ignored, not thrown on", () => {
    data.set(NOTE_KEY, "{not json");
    expect(() => noteCar("1")).not.toThrow();
    expect(journey()).toBeNull();
  });

  it("an edited note the server would refuse is not offered, so the form never lists what would be dropped", () => {
    const note = (over: object) => JSON.stringify({ start: Date.now(), cars: [{ id: "1", views: 1 }], searches: [], tools: {}, ...over });
    const bad = [
      note({ tools: { finance: { monthlyEur: null } } }),
      note({ cars: [{ id: 4710001, views: 1 }] }),
      note({ cars: [{ id: "../admin", views: 1 }] }),
      note({ cars: [{ id: "1", views: 1, url: "/x" }] }),
      note({ searches: [{ make: "Audi A4 typed" }] }),
      note({ tools: { saved: 1.5 } }),
      note({ tools: { extra: true } }),
      note({ start: "yesterday" }),
      note({ cars: null }),
      "[]",
      "5",
    ];
    for (const raw of bad) expect(journeyOf(raw), raw).toBeNull();
    // The hand check and the server's schema agree, both ways.
    const good = note({ searches: [{ fuel: "diesel", condition: "used" }], tools: { finance: { monthlyEur: 300 }, tradeIn: true, saved: 2, compared: 3 } });
    for (const raw of [...bad, good]) {
      const j = journeyOf(raw);
      if (j) expect(journeySchema.parse(j)).toEqual(j);
      const n = JSON.parse(raw);
      const built = n && typeof n === "object" && !Array.isArray(n) && { v: 1, minutes: 0, cars: n.cars, searches: n.searches, tools: n.tools };
      expect(journeySchema.safeParse(built).success && typeof n.start === "number", raw).toBe(j !== null);
    }
  });

  it("says what would be sent in plain words", () => {
    noteCar("1");
    noteCar("2");
    noteCar("3");
    noteSearch(q({ make: ["audi"] }));
    noteSearch(q({ fuel: ["electric"] }));
    noteFinance(312);
    expect(sharedLines(journey()!)).toEqual(["3 cars you looked at", "2 searches", "the finance calculator, at €312 a month", "how long you've been on the site"]);
    noteTradeIn();
    noteCount("saved", 1);
    noteCount("compared", 2);
    expect(sharedLines(journey()!).slice(3, 6)).toEqual(["that you started a valuation of your car", "1 car you saved", "2 cars you compared"]);
  });
});

// The stores note the count after every change, whatever made it: a button, the compare bar, clear, remove or undo.
describe("the saved and compared counts", () => {
  beforeEach(() => {
    const local = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => local.get(k) ?? null, setItem: (k: string, v: string) => void local.set(k, v) });
    vi.stubGlobal("window", new EventTarget());
    vi.resetModules();
  });
  const tools = () => journey()?.tools ?? {};

  it("follow the compare list", async () => {
    const c = await import("@/lib/compare/store");
    c.toggleCompare("1");
    c.toggleCompare("2");
    c.toggleCompare("3");
    expect(c.toggleCompare("4")).toBe("full");
    expect(tools().compared).toBe(3);
    c.removeCompare(["1"]);
    expect(tools().compared).toBe(2);
    c.clearCompare();
    expect(tools()).not.toHaveProperty("compared");
    c.restoreCompare(["2", "3"]);
    expect(tools().compared).toBe(2);
  });

  it("follow the saved list", async () => {
    const s = await import("@/lib/saved/store");
    s.toggleSaved("1");
    s.toggleSaved("2");
    s.toggleSaved("2");
    expect(tools().saved).toBe(1);
    s.removeSaved(["1"]);
    expect(tools()).not.toHaveProperty("saved");
    s.restoreSaved(["1"]);
    expect(tools().saved).toBe(1);
  });
});
