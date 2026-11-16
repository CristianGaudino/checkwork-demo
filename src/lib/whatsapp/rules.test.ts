import { describe, expect, it } from "vitest";
import { parseModules } from "@/lib/modules-rules";
import { ROLES } from "@/lib/permission-rules";
import { BUTTON_LABELS, EVENTS, EVENT_IDS, alertText, channelFor, defaultAlerts, eventOfLead, eventsFor, inQuiet, parsePrice } from "./rules";

describe("parsePrice", () => {
  it.each([
    ["8,500", 8500],
    ["€8.5k", 8500],
    ["8500", 8500],
    ["8.500", 8500],
    ["8 500", 8500],
    ["€ 12,000.", 12000],
    ["offer 8k euro", 8000],
    ["8,5k", 8500],
  ])("reads %s as %i", (text, eur) => expect(parsePrice(text)).toBe(eur));
  it.each(["", "abc", "50", "8.5", "9999999", "Saturday at 11", "for the 2019 one, 8,500", "8k or 9k"])("refuses %s", (text) => expect(parsePrice(text)).toBeNull());
});

describe("templates by module", () => {
  const some = (v: string) => parseModules(v);
  it("a trade-in request uses its own template only with the module, else the plain enquiry", () => {
    expect(eventOfLead("trade-in", some("dashboard,tradeIn,whatsapp"))).toBe("trade-in");
    expect(eventOfLead("sell", some("dashboard,tradeIn,whatsapp"))).toBe("trade-in");
    expect(eventOfLead("trade-in", some("dashboard,whatsapp"))).toBe("enquiry");
    expect(eventOfLead("test-drive", some("dashboard,testDrives,whatsapp"))).toBe("test-drive");
    expect(eventOfLead("test-drive", some("dashboard,whatsapp"))).toBe("enquiry");
    expect(eventOfLead("find-a-car", some("all"))).toBe("enquiry");
  });
  it("a dealer gets only the events of the modules they have", () => {
    expect(eventsFor(some("dashboard,whatsapp"))).toEqual(["enquiry", "slow-stock"]);
    expect(eventsFor(some("all"))).toEqual(EVENT_IDS);
  });
  it("every button of every template has a label, and no text has a dash", () => {
    for (const e of EVENT_IDS) for (const b of EVENTS[e].buttons) expect(BUTTON_LABELS[b]).toBeTruthy();
    const text = EVENT_IDS.map((e) => alertText(e, { first: "Sam", car: "2020 Kia Niro", stars: 5, author: "Pat", days: 50, dropEur: 500, eur: 1000, leads: 1, drives: 1, sales: 1 })).join(" ");
    expect(text).not.toMatch(/[–—]/);
  });
  it("each role starts with alerts it may act on", () => {
    for (const r of ROLES) expect(defaultAlerts(r).length).toBeGreaterThan(0);
    expect(defaultAlerts("Sales")).not.toContain("finance");
  });
});

describe("where a message goes", () => {
  it("WhatsApp under the cap, email for alerts and replies over it, and marketing is not sent", () => {
    expect(channelFor("alert", true, true)).toBe("whatsapp");
    expect(channelFor("alert", true, false)).toBe("email");
    expect(channelFor("reply", true, false)).toBe("email");
    expect(channelFor("marketing", true, false)).toBe("none");
    expect(channelFor("alert", false, true)).toBe("email");
  });
});

describe("quiet hours", () => {
  it("run across midnight, and empty means none", () => {
    expect(inQuiet("23:30", "22:00", "07:00")).toBe(true);
    expect(inQuiet("06:59", "22:00", "07:00")).toBe(true);
    expect(inQuiet("12:00", "22:00", "07:00")).toBe(false);
    expect(inQuiet("13:00", "12:00", "14:00")).toBe(true);
    expect(inQuiet("13:00", "", "")).toBe(false);
  });
});
