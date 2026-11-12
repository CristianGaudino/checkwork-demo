import { describe, expect, it } from "vitest";
import { DEALER_NAV, DEFAULT_OPEN, navGroups, openGroupsCookie, parseOpenGroups } from "./nav";

describe("the sidebar's groups", () => {
  it("puts Overview on its own, then each heading with the items under it, every item once", () => {
    const { top, groups } = navGroups(DEALER_NAV);
    expect(top.map((i) => i.label)).toEqual(["Overview"]);
    expect(groups.map((g) => g.name)).toEqual(["Sales", "Customers", "Growth", "Dealership"]);
    expect(groups[0].items.map((i) => i.label)).toEqual(["Leads", "Test drives", "Stock", "Orders", "Margins"]);
    expect(top.length + groups.reduce((n, g) => n + g.items.length, 0)).toBe(DEALER_NAV.length);
  });
  it("keeps a heading when a role filters out its first item, under the next one that names no group", () => {
    // Activity starts Dealership; without the permission the group still holds Settings, so it must still show.
    const { groups } = navGroups(DEALER_NAV.filter((i) => i.href !== "/dashboard/activity"));
    expect(groups.map((g) => g.name)).toContain("Dealership");
  });
});

describe("which groups are open", () => {
  it("starts with Sales open, and reads back what was saved, an empty choice included", () => {
    expect(parseOpenGroups(undefined)).toEqual(DEFAULT_OPEN);
    const saved = openGroupsCookie(["Sales", "Growth"]).split(";")[0].split("=")[1];
    expect(parseOpenGroups(saved)).toEqual(["Sales", "Growth"]);
    expect(parseOpenGroups("")).toEqual([]);
    expect(parseOpenGroups("%E0%A4%A")).toEqual(DEFAULT_OPEN); // does not decode
  });
});
