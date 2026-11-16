import { describe, expect, it } from "vitest";
import { afterDiscount, foundingEnd, itemise, nextBillDate, parseAlert, parseEuro, parseLimits, type Bill } from "./bills-rules";

describe("parseEuro", () => {
  it("reads blank, whole euros and cents", () => {
    expect(parseEuro("")).toEqual({});
    expect(parseEuro("20")).toEqual({ eur: 20 });
    expect(parseEuro("€20,50")).toEqual({ eur: 20.5 });
    expect(parseEuro("0")).toEqual({ eur: 0 });
  });
  it("refuses a negative, a word, three decimals and over 10,000", () => {
    for (const bad of ["-5", "abc", "1.234", "10000.01", "1e3"]) expect(parseEuro(bad).error).toBeTruthy();
    expect(parseEuro("10000")).toEqual({ eur: 10000 });
  });
});

describe("parseLimits", () => {
  const get = (v: Record<string, string>) => (k: string) => v[k] ?? "";
  it("keeps what is set and drops blanks", () => {
    expect(parseLimits(get({ "cap-ai": "9", "cap-total": "" }), {}, ["ai", "total"]).caps).toEqual({ ai: 9 });
  });
  it("never lets a limit pass ours", () => {
    const r = parseLimits(get({ "cap-total": "200" }), { total: 150 }, ["total"]);
    expect(r.errors["cap-total"]).toBe("Our limit for your account is €150");
    expect(parseLimits(get({ "cap-total": "150" }), { total: 150 }, ["total"]).errors).toEqual({});
  });
});

describe("parseAlert", () => {
  it("adds one for a scope the dealer has, once", () => {
    expect(parseAlert("ai", "20", ["ai", "total"], [])).toEqual({ alert: { scope: "ai", amountEur: 20 } });
    expect(parseAlert("ai", "20", ["ai"], [{ scope: "ai", amountEur: 20 }]).error).toBeTruthy();
    expect(parseAlert("whatsapp", "20", ["ai"], []).error).toBeTruthy();
    expect(parseAlert("ai", "", ["ai"], []).error).toBeTruthy();
    expect(parseAlert("ai", "0", ["ai"], []).error).toBeTruthy();
  });
});

describe("itemise", () => {
  const bill: Bill = {
    id: "2026-10", issuedOn: "2026-11-01", dueOn: "2026-12-01", status: "due", base: 200, modules: [{ label: "Finance", eur: 29 }], aiAssistantEur: 0, discountPct: 30,
    usage: [{ service: "ai", kind: "draft", count: 10, unitEur: 0.05 }, { service: "whatsapp", kind: "alert", count: 0, unitEur: 0.05 }],
  };
  it("takes the discount off the plan only, then adds VAT", () => {
    const t = itemise(bill);
    expect(t.planEur).toBe(229);
    expect(t.discountEur).toBe(68.7);
    expect(t.usageEur).toBe(0.5);
    expect(t.net).toBe(160.8);
    expect(t.vatEur).toBe(36.98);
    expect(t.total).toBe(197.78);
    expect(t.usage).toHaveLength(1); // a line with no uses is left out
    expect(t.usage[0].detail).toBe("10 x €0.05");
  });
});

describe("founding discount and dates", () => {
  it("is 30% off and ends 20 months on", () => {
    expect(afterDiscount(200)).toBe(140);
    expect(foundingEnd(new Date("2026-11-16T10:00:00Z"))).toBe("July 2028");
    expect(nextBillDate(new Date("2026-12-31T10:00:00Z"))).toBe("1 January 2027");
  });
});

import { servicesOf } from "./bills-rules";
describe("servicesOf", () => {
  it("lists a service only when its module is on", () => {
    expect(servicesOf(new Set(["lookupDashboard", "ai"]))).toEqual(["lookup", "ai"]);
    expect(servicesOf(new Set(["dashboard"]))).toEqual([]);
  });
});
