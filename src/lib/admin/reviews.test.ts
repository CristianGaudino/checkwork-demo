import { describe, expect, it } from "vitest";
import type { AdminReview } from "./collections";
import { filterReviews, parseReviewFilter, ratingSummary } from "./reviews";

const r = (id: string, rating: AdminReview["rating"], o: Partial<AdminReview> = {}): AdminReview => ({ id, author: id, rating, text: "", createdAt: Number(id.slice(1)), ...o });

describe("reviews", () => {
  const list = [r("a1", 5, { reply: "thanks" }), r("a2", 2), r("a3", 4)];
  it("filters and sorts newest first", () => {
    expect(filterReviews(list, "all").map((x) => x.id)).toEqual(["a3", "a2", "a1"]);
    expect(filterReviews(list, "unreplied").map((x) => x.id)).toEqual(["a3", "a2"]);
    expect(filterReviews(list, "low").map((x) => x.id)).toEqual(["a2"]);
  });
  it("summarises the stars, and handles no reviews", () => {
    const s = ratingSummary(list);
    expect(s.count).toBe(3);
    expect(s.average).toBeCloseTo(11 / 3);
    expect(s.distribution.map((d) => d.count)).toEqual([1, 1, 0, 1, 0]);
    expect(ratingSummary([])).toMatchObject({ average: 0, count: 0 });
  });
  it("falls back to all for an unknown filter", () => {
    expect(parseReviewFilter("bogus")).toBe("all");
    expect(parseReviewFilter("flagged")).toBe("all"); // flags are gone: Google has no way to take them
  });
});
