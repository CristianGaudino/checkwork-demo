import { describe, expect, it } from "vitest";
import { DEALER_NAV, DEFAULT_OPEN, navGroups, openGroupsCookie, parseOpenGroups } from "./nav";

describe("the sidebar's groups", () => {
  it("puts Overview and the everyday places on their own, then each heading with the items under it, every item once", () => {
    const { top, groups } = navGroups(DEALER_NAV);
    expect(top.map((i) => i.label)).toEqual(["Overview", "Leads", "Test drives", "Stock", "Posts and emails"]);
    expect(groups.map((g) => g.name)).toEqual(["Customers", "Results", "Settings and help"]);
    expect(groups[0].items.map((i) => i.label)).toEqual(["Customers", "WhatsApp", "Orders", "Aftersales", "Reviews"]);
    expect(top.length + groups.reduce((n, g) => n + g.items.length, 0)).toBe(DEALER_NAV.length);
  });
  it("keeps a heading when a role filters out its first item", () => {
    // Margins starts Results; without the permission the group still holds the monthly report, so it must still show.
    const { groups } = navGroups(DEALER_NAV.filter((i) => i.href !== "/dashboard/margins"));
    expect(groups.map((g) => g.name)).toContain("Results");
  });
});

describe("which groups are open", () => {
  it("starts with Customers open, and reads back what was saved, an empty choice included", () => {
    expect(parseOpenGroups(undefined)).toEqual(DEFAULT_OPEN);
    expect(DEFAULT_OPEN).toEqual(["Customers"]);
    const saved = openGroupsCookie(["Customers", "Results"]).split(";")[0].split("=")[1];
    expect(parseOpenGroups(saved)).toEqual(["Customers", "Results"]);
    expect(parseOpenGroups("")).toEqual([]);
    expect(parseOpenGroups("%E0%A4%A")).toEqual(DEFAULT_OPEN); // does not decode
  });
});
