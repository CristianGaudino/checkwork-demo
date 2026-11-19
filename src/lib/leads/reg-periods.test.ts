import { describe, expect, it } from "vitest";
import { regPeriodLabel, regPeriodOf, regPeriods } from "./reg-periods";

describe("registration periods", () => {
  it("names the half of the year a day falls in", () => {
    expect(regPeriodOf("2027-01-02")).toBe("271");
    expect(regPeriodOf("2026-06-30")).toBe("261");
    expect(regPeriodOf("2026-07-01")).toBe("262");
  });
  it("offers this period and the next three, across the new year", () => {
    expect(regPeriods("2026-11-12")).toEqual(["262", "271", "272", "281"]);
    expect(regPeriods("2027-03-01")).toEqual(["271", "272", "281", "282"]);
    expect(regPeriodLabel("271")).toBe("271 reg, January to June 2027");
  });
});
