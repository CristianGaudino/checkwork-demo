import { describe, expect, it } from "vitest";
import { addMonths, daysSince, fmtAgo, fmtDateTime, fmtDay, fmtEur, fmtPct, fmtTime, plural } from "./format";

describe("admin format", () => {
  const now = new Date("2026-11-10T12:00:00Z").getTime();
  it("says how long ago, in the biggest unit that fits", () => {
    expect(fmtAgo(now - 5 * 3600_000, now)).toBe("5 hours ago");
    expect(fmtAgo(now - 86400_000, now)).toBe("yesterday");
    expect(fmtAgo(now - 20_000, now)).toBe("just now");
  });
  it("writes euros without cents and a percentage with one decimal at most", () => {
    expect(fmtEur(12500)).toBe("€12,500");
    expect(fmtPct(12.345)).toBe("12.3%");
    expect(fmtPct(8)).toBe("8%");
  });
});

describe("Irish time", () => {
  it("shows a summer moment an hour ahead of UTC, and a winter one the same", () => {
    expect(fmtDateTime(Date.UTC(2026, 6, 1, 10, 0))).toContain("11:00");
    expect(fmtDateTime(Date.UTC(2026, 0, 15, 10, 0))).toContain("10:00");
  });
});

describe("addMonths", () => {
  it("keeps the day, or takes the month's last when it is shorter", () => {
    expect(addMonths("2026-11-11", 2)).toBe("2027-01-11");
    expect(addMonths("2026-12-31", 2)).toBe("2027-02-28");
    expect(addMonths("2027-12-31", 2)).toBe("2028-02-29");
  });
});

describe("plural", () => {
  it("says one, many and none as written, with the number formatted", () => {
    expect(plural(1, "review")).toBe("1 review");
    expect(plural(0, "review")).toBe("0 reviews");
    expect(plural(1284, "car")).toBe("1,284 cars");
    expect(plural(2, "sold car")).toBe("2 sold cars");
  });
  it("says a calendar day the same in any zone, and a time in Irish time", () => {
    expect(fmtDay("2026-11-12")).toBe("Thursday, 12 November");
    expect(fmtDay("2026-11-12", "weekday")).toBe("Thu");
    expect(fmtDay("2026-11-12", "day")).toBe("12");
    expect(fmtDay("2026-11-12", "month")).toBe("Nov");
    expect(fmtDay("2026-11-12", "dayMonth")).toBe("12 November");
    expect(fmtTime(Date.parse("2026-07-01T10:30:00Z"))).toBe("11:30"); // summer time
    expect(fmtTime(Date.parse("2026-11-12T10:30:00Z"))).toBe("10:30");
  });
  it("counts whole days in stock, never below zero", () => {
    const now = Date.parse("2026-11-10T12:00:00Z");
    expect(daysSince("2026-11-01", now)).toBe(9);
    expect(daysSince("2026-11-10", now)).toBe(0);
    expect(daysSince("2026-12-01", now)).toBe(0);
  });
});
