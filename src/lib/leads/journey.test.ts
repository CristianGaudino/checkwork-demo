import { describe, expect, it } from "vitest";
import { parseJourney } from "./journey";

const ok = { v: 1, minutes: 12, cars: [{ id: "4710001", views: 3 }], searches: [{ make: "audi", model: "a3", fuel: "diesel", gearbox: "manual", priceBand: "10k-20k", condition: "used" }], tools: { finance: { monthlyEur: 312 }, tradeIn: true, saved: 2, compared: 1 } };
const parse = (v: unknown) => parseJourney(JSON.stringify(v));

describe("parseJourney (the server's check of a shared visit note)", () => {
  it("takes a contract-valid v1 note as it is", () => {
    expect(parse(ok)).toEqual(ok);
    expect(parse({ v: 1, minutes: 0, cars: [], searches: [], tools: {} })).toEqual({ v: 1, minutes: 0, cars: [], searches: [], tools: {} });
  });

  it("refuses unknown keys anywhere", () => {
    expect(parse({ ...ok, ip: "1.2.3.4" })).toBeNull();
    expect(parse({ ...ok, cars: [{ id: "1", views: 1, url: "/x" }] })).toBeNull();
    expect(parse({ ...ok, searches: [{ q: "red golf" }] })).toBeNull();
    expect(parse({ ...ok, tools: { finance: { monthlyEur: 1, note: "x" } } })).toBeNull();
    expect(parse({ ...ok, tools: { email: "a@b.ie" } })).toBeNull();
  });

  it("refuses free text and values off the fixed lists", () => {
    expect(parse({ ...ok, searches: [{ make: "Audi A3, call me on 087 1234567" }] })).toBeNull();
    expect(parse({ ...ok, searches: [{ make: "x".repeat(41) }] })).toBeNull();
    expect(parse({ ...ok, searches: [{ fuel: "jet" }] })).toBeNull();
    expect(parse({ ...ok, searches: [{ priceBand: "cheap" }] })).toBeNull();
    expect(parse({ ...ok, cars: [{ id: "abc", views: 1 }] })).toBeNull();
  });

  it("refuses numbers past their caps, fractions, too many entries and another version", () => {
    expect(parse({ ...ok, minutes: 241 })).toBeNull();
    expect(parse({ ...ok, minutes: 1.5 })).toBeNull();
    expect(parse({ ...ok, cars: [{ id: "1", views: 100 }] })).toBeNull();
    expect(parse({ ...ok, cars: [{ id: "1", views: 0 }] })).toBeNull();
    expect(parse({ ...ok, tools: { finance: { monthlyEur: 5001 } } })).toBeNull();
    expect(parse({ ...ok, tools: { saved: -1 } })).toBeNull();
    expect(parse({ ...ok, cars: Array.from({ length: 13 }, (_, i) => ({ id: String(i + 1), views: 1 })) })).toBeNull();
    expect(parse({ ...ok, searches: Array.from({ length: 9 }, () => ({ make: "audi" })) })).toBeNull();
    expect(parse({ ...ok, v: 2 })).toBeNull();
  });

  it("refuses a missing field, a body that is not JSON, and one over 4 KB", () => {
    expect(parseJourney(null)).toBeNull();
    expect(parseJourney(new File(["{}"], "j.json"))).toBeNull();
    expect(parseJourney("{not json")).toBeNull();
    expect(parse({ v: 1, minutes: 1, cars: [] })).toBeNull();
    expect(parseJourney(JSON.stringify(ok) + " ".repeat(4096))).toBeNull();
  });
});
