import { describe, expect, it } from "vitest";
import { addDays, addMonths, dublinDay, dublinMs, fmtDay } from "./format";

describe("fmtDay", () => {
  it("says a calendar day the same in any zone", () => {
    expect(fmtDay("2026-11-12")).toBe("Thursday, 12 November");
  });
});

describe("Irish time", () => {
  it("reads a day and time as Irish time, an hour ahead of UTC in summer", () => {
    expect(dublinMs("2026-07-01", "11:00")).toBe(Date.UTC(2026, 6, 1, 10, 0));
    expect(dublinMs("2026-01-15", "11:00")).toBe(Date.UTC(2026, 0, 15, 11, 0));
  });
  it("names the Irish calendar day of a moment", () => {
    expect(dublinDay(Date.UTC(2026, 6, 1, 23, 30))).toBe("2026-07-02");
  });
});

describe("addDays and addMonths", () => {
  it("add days across a month end", () => {
    expect(addDays("2026-11-30", 2)).toBe("2026-12-02");
  });
  it("keep the day, or take the month's last when it is shorter", () => {
    expect(addMonths("2026-11-11", 2)).toBe("2027-01-11");
    expect(addMonths("2026-12-31", 2)).toBe("2027-02-28");
    expect(addMonths("2027-12-31", 2)).toBe("2028-02-29");
  });
});
