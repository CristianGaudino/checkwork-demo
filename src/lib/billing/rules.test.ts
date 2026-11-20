import { describe, expect, it } from "vitest";
import { MODULE_IDS } from "@/lib/modules-rules";
import { BILLING_DEFAULT, allowanceFor, alertsCrossed, setupEur, setupLines, capOf, monthEndEstimate, planEur, planFor, planLines, presetName, termSetupEur, usageCosts, usageEstimate, withinCaps, yearUpfrontEur, type BillingSettings, type UsageCount } from "./rules";

const c = (service: UsageCount["service"], kind: string, count: number): UsageCount => ({ id: `m:${service}:${kind}`, month: "2026-11", service, kind, count });

const SHOWROOM = ["tradeIn", "finance", "carFinder", "lookupWebsite", "reviews"] as const;
const DEALER = [...SHOWROOM, "dashboard", "testDrives", "sales", "analytics", "whatsapp", "ai", "lookupDashboard"] as const;
const GROUP = [...DEALER, "margins", "social", "newsletter", "newCars", "commercial"] as const;
const opts = (o: Partial<BillingSettings> = {}): BillingSettings => ({ ...BILLING_DEFAULT, ...o });

describe("usage costs", () => {
  it("prices each line, and adds them up", () => {
    const u = usageCosts([c("lookup", "website", 10), c("whatsapp", "alert", 20), c("whatsapp", "reply", 50), c("ai", "opus", 4), c("ai", "sonnet", 5)], {});
    expect(u.lookup.costEur).toBe(3);
    expect(u.whatsapp.costEur).toBe(2.5); // 20 x 0.05 + 50 x 0.03
    expect(u.ai.costEur).toBe(0.52); // 4 x 0.08 + 5 x 0.04
    expect(u.totalEur).toBe(6.02);
  });

  it("puts the allowance against each service first, then bills per use over it; WhatsApp's covers alerts only", () => {
    expect(usageCosts([c("ai", "opus", 250), c("ai", "sonnet", 50)], { ai: 300 }).ai.costEur).toBe(0);
    expect(usageCosts([c("ai", "opus", 250), c("ai", "sonnet", 70)], { ai: 300 }).ai.costEur).toBe(0.8); // 20 Sonnet over x 0.04
    expect(usageCosts([c("lookup", "website", 20), c("lookup", "dashboard", 10)], { lookup: 25 }).lookup.costEur).toBe(1.5); // 5 over x 0.30
    const w = usageCosts([c("whatsapp", "alert", 510), c("whatsapp", "reply", 10)], { whatsapp: 500 }).whatsapp;
    expect(w.costEur).toBe(0.8); // 10 alerts over x 0.05 + 10 replies x 0.03
    expect(w.kinds.map((k) => k.included)).toEqual([500, 0, 0]);
  });

  it("each tier's allowance, Group's lookups and alerts per branch; the AI assistant only without a tier's AI allowance", () => {
    expect(allowanceFor(SHOWROOM, opts())).toEqual({ lookup: 25 });
    expect(allowanceFor(DEALER, opts({ aiPlan: "assistant" }))).toEqual({ lookup: 100, whatsapp: 500, ai: 100 });
    expect(allowanceFor(GROUP, opts({ branches: 3 }))).toEqual({ lookup: 300, whatsapp: 1500, ai: 300 });
    expect(allowanceFor(["dashboard", "ai"], opts({ aiPlan: "assistant" }))).toEqual({ ai: 300 });
    expect(allowanceFor(["dashboard", "ai"], opts())).toEqual({});
    expect(allowanceFor([...SHOWROOM, "dashboard", "ai"], opts({ aiPlan: "assistant" }))).toEqual({ lookup: 25, ai: 300 }); // Showroom has no AI allowance
  });
});

describe("setup fees", () => {
  it("are the tier's, or the website's, plus each add-on set up with an outside account, and new-car brands past two", () => {
    expect(setupLines([])).toEqual([{ label: "Website", eur: 1200 }]);
    expect(setupEur(["dashboard", "finance"])).toBe(1200);
    expect(setupEur(SHOWROOM)).toBe(950);
    expect(setupEur(DEALER)).toBe(950); // WhatsApp is in the tier
    expect(setupEur([...DEALER, "social"])).toBe(950 + 150);
    expect(setupEur([...DEALER, "newCars"], opts({ brands: 4 }))).toBe(950 + 400 + 2 * 100);
    expect(setupEur(GROUP)).toBe(1950);
    expect(setupEur(GROUP, opts({ brands: 3 }))).toBe(1950 + 100);
  });
  it("are waived on a 2-year contract, and a year upfront is 11 months' price", () => {
    expect(termSetupEur(950, "twoYear")).toBe(0);
    expect(termSetupEur(950, "annual")).toBe(950);
    expect(termSetupEur(950, "monthly")).toBe(950);
    expect(yearUpfrontEur(planEur(DEALER, "perAction"))).toBe(4939);
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
    expect(withinCaps(usageCosts([c("ai", "opus", 99)], {}), b, "ai")).toBe(true); // 7.92
    expect(withinCaps(usageCosts([c("ai", "opus", 100)], {}), b, "ai")).toBe(false); // 8.00
    expect(withinCaps(usageCosts([c("lookup", "website", 100)], {}), b, "lookup")).toBe(false); // 30, the total
  });
});

describe("alerts", () => {
  const b: BillingSettings = { ...BILLING_DEFAULT, caps: { lookup: 10 }, alerts: [{ scope: "total", amountEur: 5 }] };
  it("fires the 80% mark, the cap and a chosen amount as each is crossed, once each", () => {
    const before = usageCosts([c("lookup", "website", 26)], {}); // 7.80
    const after = usageCosts([c("lookup", "website", 27)], {}); // 8.10
    expect(alertsCrossed(before, after, b, "2026-11").map((a) => a.key)).toEqual(["2026-11:lookup:80:10"]);
    const atCap = alertsCrossed(usageCosts([c("lookup", "website", 33)], {}), usageCosts([c("lookup", "website", 34)], {}), b, "2026-11");
    expect(atCap.map((a) => a.key)).toEqual(["2026-11:lookup:cap:10"]);
    const chosen = alertsCrossed(usageCosts([c("lookup", "website", 16)], {}), usageCosts([c("lookup", "website", 17)], {}), b, "2026-11");
    expect(chosen.map((a) => a.key)).toEqual(["2026-11:total:5"]);
  });
  it("sends no 80% alert when it is turned off", () => {
    const off = { ...b, alertAt80: false };
    expect(alertsCrossed(usageCosts([c("lookup", "website", 26)], {}), usageCosts([c("lookup", "website", 27)], {}), off, "2026-11")).toEqual([]);
  });
});

describe("the plan and the estimate", () => {
  it("prices the base and the modules, with the assistant's fee when chosen", () => {
    expect(planEur([], "perAction")).toBe(200);
    expect(planEur(["dashboard", "finance"], "assistant")).toBe(200 + 49 + 29 + 19);
  });
  it("prices a tier when it is cheaper, with add-ons at their own price", () => {
    expect(planFor(SHOWROOM)).toMatchObject({ name: "Showroom", eur: 249, separateEur: 326, saving: 77, extras: [] });
    expect(planFor(DEALER)).toMatchObject({ name: "Dealer", eur: 449, extras: [] });
    expect(planFor([...DEALER, "service", "commercial"])).toMatchObject({ name: "Dealer", eur: 449 + 49 + 29, extras: ["service", "commercial"] });
    expect(planFor(GROUP)).toMatchObject({ name: "Group", eur: 749 });
    expect(planFor([...DEALER, "margins", "social", "newsletter", "newCars"])).toMatchObject({ name: "Group", eur: 749 }); // Dealer and these add-ons would be 755
    expect(planFor(SHOWROOM, { branches: 2, brands: 1 })).toMatchObject({ name: "Group", eur: 898 }); // more than one branch is a Group
    expect(planEur(GROUP, "perAction", opts({ branches: 3 }))).toBe(1047); // 749 + 2 x 149
    expect(planEur(MODULE_IDS, "perAction")).toBe(749 + 49); // Group and Service
    expect(planFor(["finance"])).toMatchObject({ name: "Custom", eur: 229, saving: 0 });
    expect(planFor([]).name).toBe("Base only");
    expect(presetName(SHOWROOM)).toBe("Showroom");
    expect(presetName(DEALER)).toBe("Dealer");
    expect(presetName(GROUP)).toBe("Group");
    expect(presetName(DEALER.filter((m) => m !== "ai"))).toBe("Dealer"); // a per-use module (€0) is not part of the plan's name
    expect(presetName([...DEALER, "service"])).toBe("Custom");
    // A free module off never makes the plan dearer, and adding a module never makes it cheaper.
    expect(planEur(MODULE_IDS.filter((m) => m !== "ai"), "perAction")).toBe(798);
    for (const m of MODULE_IDS) {
      const without = MODULE_IDS.filter((x) => x !== m);
      expect(planFor(MODULE_IDS).eur - planFor(without).eur).toBeGreaterThanOrEqual(0);
    }
    expect(planLines([...SHOWROOM, "commercial", "ai"])).toEqual([{ label: "Showroom plan", eur: 249 }, { label: "Commercial vehicles", eur: 29 }]);
    expect(planLines([])).toEqual([{ label: "Website", eur: 200 }]);
    expect(planLines(GROUP, opts({ branches: 3 }))).toEqual([{ label: "Group plan", eur: 749 }, { label: "2 more branches", eur: 298 }]);
  });
  it("prices new cars for 2 brands, then each more brand, in a tier or as an add-on", () => {
    const newCars = (brands: number) => planEur([...DEALER, "newCars"], "perAction", opts({ brands })) - 449;
    expect(newCars(1)).toBe(99);
    expect(newCars(2)).toBe(99);
    expect(newCars(4)).toBe(157); // 99 + 2 x 29
    expect(planLines(GROUP, opts({ brands: 3 }))).toEqual([{ label: "Group plan", eur: 749 }, { label: "New cars: 1 more brand", eur: 29 }]);
  });
  it("takes the month to date to a whole month at the same pace", () => {
    expect(monthEndEstimate(10, "2026-11-10")).toBe(30); // 10 of 30 days
    expect(monthEndEstimate(1, "2026-12-01")).toBe(31); // the 1st in Dublin, whatever the UTC day
  });
  it("stops each service at its own limit, then all of it at the total limit, and never below what is spent", () => {
    const costs = (lookup: number, ai: number) => ({ ...usageCosts([], {}), lookup: { count: 0, costEur: lookup, kinds: [] }, ai: { count: 0, costEur: ai, kinds: [] }, totalEur: lookup + ai });
    const b = (caps: BillingSettings["caps"]): BillingSettings => ({ ...BILLING_DEFAULT, caps, ceilings: {} });
    expect(usageEstimate(costs(9, 1), b({ lookup: 10 }), "2026-11-10")).toBe(13); // lookups stop at 10, AI goes on to 3
    expect(usageEstimate(costs(9, 1), b({ total: 12 }), "2026-11-10")).toBe(12);
    expect(usageEstimate(costs(9, 1), b({ lookup: 5 }), "2026-11-10")).toBe(12); // a limit lowered below the spend: 9 spent, AI to 3
  });
});
