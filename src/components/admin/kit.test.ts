import { describe, expect, it } from "vitest";
import { paginate, sortRows, type Column } from "./kit";

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

describe("sortRows", () => {
  type R = { name: string; price?: number };
  const rows: R[] = [{ name: "b10", price: 3 }, { name: "B2" }, { name: "a", price: 1 }];
  const cols: Column<R>[] = [
    { key: "name", header: "Name", cell: () => null, sort: (r) => r.name },
    { key: "price", header: "Price", cell: () => null, sort: (r) => r.price },
    { key: "photo", header: "Photo", cell: () => null },
  ];
  const by = (sp: { sort?: string; dir?: string }) => sortRows(rows, cols, sp, { key: "price", dir: "desc" });
  it("sorts by the column the URL names, either way, letters as people read them, empties last", () => {
    expect(by({ sort: "name" }).rows.map((r) => r.name)).toEqual(["a", "B2", "b10"]);
    expect(by({ sort: "name", dir: "desc" }).rows.map((r) => r.name)).toEqual(["b10", "B2", "a"]);
    expect(by({ sort: "price" }).rows.map((r) => r.price)).toEqual([1, 3, undefined]);
    expect(by({ sort: "price", dir: "desc" }).rows.map((r) => r.price)).toEqual([3, 1, undefined]);
  });
  it("ignores a column that does not sort or does not exist, and keeps the page's own order", () => {
    expect(by({ sort: "photo" }).sort).toEqual({ key: "price", dir: "desc" });
    expect(by({ sort: "nope" }).rows.map((r) => r.price)).toEqual([3, 1, undefined]);
    expect(sortRows(rows, cols, {}, { key: "", dir: "asc" }).rows).toEqual(rows);
  });
});
