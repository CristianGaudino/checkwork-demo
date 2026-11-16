import { describe, expect, it } from "vitest";
import { BILLING_DEFAULT, alertsCrossed, capOf, monthEndEstimate, planEur, usageCosts, withinCaps, type BillingSettings, type UsageCount } from "./rules";

const c = (service: UsageCount["service"], kind: string, count: number): UsageCount => ({ id: `m:${service}:${kind}`, month: "2026-11", service, kind, count });

describe("usage costs", () => {
  it("prices each line, and adds them up", () => {
    const u = usageCosts([c("lookup", "website", 10), c("whatsapp", "alert", 20), c("whatsapp", "reply", 50), c("ai", "draft", 4)], "perAction");
    expect(u.lookup.costEur).toBe(3);
    expect(u.whatsapp.costEur).toBe(2); // 20 x 0.05 + 50 x 0.02
    expect(u.ai.costEur).toBe(0.2);
    expect(u.totalEur).toBe(5.2);
  });

  it("puts the assistant plan's allowance against AI first, then bills per action over it", () => {
    expect(usageCosts([c("ai", "draft", 250), c("ai", "adjust", 40)], "assistant").ai.costEur).toBe(0);
    expect(usageCosts([c("ai", "draft", 250), c("ai", "adjust", 70)], "assistant").ai.costEur).toBe(1); // 20 over x 0.05
  });
});

describe("caps", () => {
  const b: BillingSettings = { ...BILLING_DEFAULT, caps: { ai: 10, total: 30 }, ceilings: { ai: 8 } };
  it("uses the lower of the dealer's cap and our ceiling", () => {
    expect(capOf(b, "ai")).toBe(8);
    expect(capOf(b, "total")).toBe(30);
    expect(capOf(b, "lookup")).toBeUndefined();
  });
  it("stops a service at its own cap or at the total cap", () => {
    expect(withinCaps(usageCosts([c("ai", "draft", 159)], "perAction"), b, "ai")).toBe(true); // 7.95
    expect(withinCaps(usageCosts([c("ai", "draft", 160)], "perAction"), b, "ai")).toBe(false); // 8.00
    expect(withinCaps(usageCosts([c("lookup", "website", 100)], "perAction"), b, "lookup")).toBe(false); // 30, the total
  });
});

describe("alerts", () => {
  const b: BillingSettings = { ...BILLING_DEFAULT, caps: { lookup: 10 }, alerts: [{ scope: "total", amountEur: 5 }] };
  it("fires the 80% mark, the cap and a chosen amount as each is crossed, once each", () => {
    const before = usageCosts([c("lookup", "website", 26)], "perAction"); // 7.80
    const after = usageCosts([c("lookup", "website", 27)], "perAction"); // 8.10
    expect(alertsCrossed(before, after, b, "2026-11").map((a) => a.key)).toEqual(["2026-11:lookup:80:10"]);
    const atCap = alertsCrossed(usageCosts([c("lookup", "website", 33)], "perAction"), usageCosts([c("lookup", "website", 34)], "perAction"), b, "2026-11");
    expect(atCap.map((a) => a.key)).toEqual(["2026-11:lookup:cap:10"]);
    const chosen = alertsCrossed(usageCosts([c("lookup", "website", 16)], "perAction"), usageCosts([c("lookup", "website", 17)], "perAction"), b, "2026-11");
    expect(chosen.map((a) => a.key)).toEqual(["2026-11:total:5"]);
  });
  it("sends no 80% alert when it is turned off", () => {
    const off = { ...b, alertAt80: false };
    expect(alertsCrossed(usageCosts([c("lookup", "website", 26)], "perAction"), usageCosts([c("lookup", "website", 27)], "perAction"), off, "2026-11")).toEqual([]);
  });
});

describe("the plan and the estimate", () => {
  it("prices the base and the modules, with the assistant's fee when chosen", () => {
    expect(planEur([], "perAction")).toBe(200);
    expect(planEur(["dashboard", "finance"], "assistant")).toBe(200 + 49 + 29 + 19);
  });
  it("takes the month to date to a whole month at the same pace", () => {
    expect(monthEndEstimate(10, "2026-11-10")).toBe(30); // 10 of 30 days
    expect(monthEndEstimate(1, "2026-12-01")).toBe(31); // the 1st in Dublin, whatever the UTC day
  });
});
