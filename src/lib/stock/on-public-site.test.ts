import { describe, expect, it } from "vitest";
import { SOLD_VISIBLE_DAYS, onPublicSite } from "./types";

const now = Date.parse("2026-11-20T12:00:00Z");
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString().slice(0, 10);

describe("onPublicSite", () => {
  it("is a car for sale, or one sold inside the sold period; never a hidden car, a draft or one sold long ago", () => {
    expect(onPublicSite({}, now)).toBe(true);
    expect(onPublicSite({ soldAt: daysAgo(3) }, now)).toBe(true);
    expect(onPublicSite({ soldAt: daysAgo(SOLD_VISIBLE_DAYS + 1) }, now)).toBe(false);
    expect(onPublicSite({ listing: "hidden" }, now)).toBe(false);
    expect(onPublicSite({ listing: "draft" }, now)).toBe(false);
  });
});
