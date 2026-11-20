import { describe, expect, it } from "vitest";
import { MODULE_IDS, moduleForPath, parseModules, pathAllowed, withModule, withoutModule } from "./modules-rules";

describe("modules", () => {
  it("reads unset or 'all' as every module, so an older site keeps what it had", () => {
    expect(parseModules(undefined).size).toBe(MODULE_IDS.length);
    expect(parseModules("all").size).toBe(MODULE_IDS.length);
  });

  it("reads an empty setting as the base site only, and ignores what it does not know", () => {
    expect([...parseModules("")]).toEqual([]);
    expect([...parseModules("finance,rocket")]).toEqual(["finance"]);
  });

  it("drops a module whose needs are off, through the chain", () => {
    expect(parseModules("margins,sales").has("margins")).toBe(false); // sales needs the dashboard
    expect([...parseModules("margins,sales,dashboard")].sort()).toEqual(["dashboard", "margins", "sales"]);
  });

  it("turning one on brings what it needs; turning one off takes what needs it", () => {
    expect([...withModule(new Set(), "margins")].sort()).toEqual(["dashboard", "margins", "sales"]);
    expect([...withoutModule(parseModules("dashboard,sales,margins,finance"), "dashboard")]).toEqual(["finance"]);
  });

  it("finds the module of a path by its longest prefix", () => {
    expect(moduleForPath("/dashboard/test-drives/abc")).toBe("testDrives");
    expect(moduleForPath("/dashboard/leads")).toBe("dashboard");
    expect(moduleForPath("/new-cars/order")).toBe("newCars");
    expect(moduleForPath("/used-cars")).toBeUndefined();
    expect(moduleForPath("/financed")).toBeUndefined(); // a prefix is a whole segment
  });

  it("allows the base site always, a module page only with its module, and a dashboard page only with the dashboard too", () => {
    const base = parseModules("");
    expect(pathAllowed("/used-cars", base)).toBe(true);
    expect(pathAllowed("/finance", base)).toBe(false);
    expect(pathAllowed("/dashboard", base)).toBe(false);
    expect(pathAllowed("/finance", parseModules("finance"))).toBe(true);
    expect(pathAllowed("/dashboard/test-drives", parseModules("dashboard,testDrives"))).toBe(true);
  });

  it("shows reviews on a site without the dashboard, and keeps the replies page in the dashboard (#224)", () => {
    const showroom = parseModules("reviews");
    expect([...showroom]).toEqual(["reviews"]);
    expect(pathAllowed("/reviews", showroom)).toBe(true);
    expect(pathAllowed("/dashboard/reviews", showroom)).toBe(false);
    expect(pathAllowed("/dashboard/reviews", parseModules("dashboard,reviews"))).toBe(true);
    expect([...withModule(new Set(), "reviews")]).toEqual(["reviews"]);
    expect([...withoutModule(parseModules("dashboard,reviews"), "dashboard")]).toEqual(["reviews"]);
  });
});
