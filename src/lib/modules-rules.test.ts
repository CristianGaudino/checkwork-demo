import { describe, expect, it } from "vitest";
import { moduleForPath, pathAllowed, type ModuleId } from "./modules-rules";

const on = (...ids: ModuleId[]) => new Set<ModuleId>(ids);

// The archived dashboard's plans (Billing). The public site has no modules.
describe("modules", () => {

  it("finds the module of a dashboard path by its longest prefix; a public path has none", () => {
    expect(moduleForPath("/dashboard/test-drives/abc")).toBe("testDrives");
    expect(moduleForPath("/dashboard/leads")).toBe("dashboard");
    for (const p of ["/used-cars", "/finance", "/new-cars/order", "/commercial", "/test-drive"]) expect(moduleForPath(p), p).toBeUndefined();
  });

  it("allows a dashboard page only with its module and the dashboard", () => {
    expect(pathAllowed("/dashboard", on())).toBe(false);
    expect(pathAllowed("/dashboard/reviews", on("reviews"))).toBe(false);
    expect(pathAllowed("/dashboard/test-drives", on("dashboard", "testDrives"))).toBe(true);
    expect(pathAllowed("/finance", on())).toBe(true);
  });
});
