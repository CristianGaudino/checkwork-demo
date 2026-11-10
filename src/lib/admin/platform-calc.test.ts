import { describe, expect, it } from "vitest";
import { monthlyEur, usageState } from "./platform-calc";

describe("monthlyEur", () => {
  it("is the plan plus its add-ons for an active account", () => {
    expect(monthlyEur({ plan: "growth", addons: ["social", "alerts"], status: "active" })).toBe(199 + 39 + 19);
    expect(monthlyEur({ plan: "starter", addons: [], status: "active" })).toBe(99);
  });
  it("is nothing for a trial or a paused account, and ignores an unknown add-on", () => {
    expect(monthlyEur({ plan: "pro", addons: ["ads"], status: "trial" })).toBe(0);
    expect(monthlyEur({ plan: "pro", addons: [], status: "paused" })).toBe(0);
    expect(monthlyEur({ plan: "pro", addons: ["nope"], status: "active" })).toBe(349);
  });
});

describe("usageState", () => {
  it("is good under 80%, warn from 80% to 100%, bad over", () => {
    expect(usageState(40, 100).tone).toBe("good");
    expect(usageState(80, 100).tone).toBe("warn");
    expect(usageState(100, 100).tone).toBe("warn");
    expect(usageState(101, 100).tone).toBe("bad");
  });
  it("copes with a limit of zero", () => {
    expect(usageState(0, 0).tone).toBe("good");
    expect(usageState(3, 0).tone).toBe("bad");
  });
});
