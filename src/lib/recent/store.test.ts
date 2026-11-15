import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Node environment: a hand-rolled localStorage, as in the saved store's test.
let data: Map<string, string>;
let store: typeof import("./store");
const ids = () => JSON.parse(data.get(store.RECENT_KEY) ?? "[]");

beforeEach(async () => {
  data = new Map();
  vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) });
  vi.stubGlobal("window", new EventTarget());
  vi.resetModules();
  store = await import("./store");
});

afterEach(() => vi.unstubAllGlobals());

describe("recently viewed", () => {
  it("puts the car just opened first, once", () => {
    store.noteViewed("1");
    store.noteViewed("2");
    store.noteViewed("1");
    expect(ids()).toEqual(["1", "2"]);
  });

  it("drops the oldest past the cap, and clears", () => {
    for (let i = 1; i <= store.RECENT_MAX + 2; i++) store.noteViewed(String(i));
    expect(ids()).toHaveLength(store.RECENT_MAX);
    expect(ids()[0]).toBe(String(store.RECENT_MAX + 2));
    expect(ids()).not.toContain("1");
    store.clearRecent();
    expect(ids()).toEqual([]);
  });
});
