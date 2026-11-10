import { describe, expect, it } from "vitest";
import { fmtAgo, fmtEur, fmtPct } from "./format";

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
