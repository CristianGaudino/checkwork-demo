import { describe, expect, it } from "vitest";
import { paginate } from "./kit";

describe("paginate", () => {
  const rows = Array.from({ length: 120 }, (_, i) => i);
  it("cuts a long list into pages of 50", () => {
    expect(paginate(rows, "2")).toMatchObject({ page: 2, pageCount: 3, total: 120, rows: rows.slice(50, 100) });
    expect(paginate(rows, "3").rows).toHaveLength(20);
  });
  it("a bad or stale page number shows the nearest real page, never an empty one", () => {
    expect(paginate(rows, "99").page).toBe(3);
    expect(paginate(rows, "0").page).toBe(1);
    expect(paginate(rows, "abc").page).toBe(1);
    expect(paginate(rows, undefined).page).toBe(1);
    expect(paginate([], "4")).toMatchObject({ page: 1, pageCount: 1, rows: [] });
  });
});
