import { describe, expect, it } from "vitest";
import { MODULE_IDS, moduleForPath, parseModules, pathAllowed, withModule } from "./modules-rules";

// The archived dashboard's plans (Billing). The public site has no modules.
describe("modules", () => {
  it("reads unset or 'all' as every module", () => {
    expect(parseModules(undefined).size).toBe(MODULE_IDS.length);
    expect(parseModules("all").size).toBe(MODULE_IDS.length);
  });

  it("reads an empty setting as none, and ignores what it does not know", () => {
    expect([...parseModules("")]).toEqual([]);
    expect([...parseModules("finance,rocket")]).toEqual(["finance"]);
  });

  it("drops a module whose needs are off, through the chain", () => {
    expect(parseModules("margins,sales").has("margins")).toBe(false); // sales needs the dashboard
    expect([...parseModules("margins,sales,dashboard")].sort()).toEqual(["dashboard", "margins", "sales"]);
  });

  it("turning one on brings what it needs", () => {
    expect([...withModule(new Set(), "margins")].sort()).toEqual(["dashboard", "margins", "sales"]);
  });

  it("finds the module of a dashboard path by its longest prefix; a public path has none", () => {
    expect(moduleForPath("/dashboard/test-drives/abc")).toBe("testDrives");
    expect(moduleForPath("/dashboard/leads")).toBe("dashboard");
    for (const p of ["/used-cars", "/finance", "/new-cars/order", "/commercial", "/test-drive"]) expect(moduleForPath(p), p).toBeUndefined();
  });

  it("allows a dashboard page only with its module and the dashboard", () => {
    expect(pathAllowed("/dashboard", parseModules(""))).toBe(false);
    expect(pathAllowed("/dashboard/reviews", parseModules("reviews"))).toBe(false);
    expect(pathAllowed("/dashboard/test-drives", parseModules("dashboard,testDrives"))).toBe(true);
    expect(pathAllowed("/finance", parseModules(""))).toBe(true);
  });
});
