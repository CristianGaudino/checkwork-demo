import { describe, expect, it } from "vitest";
import { pageList } from "./TableTools";

describe("pageList", () => {
  it("shows every page when there are few", () => {
    expect(pageList(1, 1)).toEqual([1]);
    expect(pageList(2, 3)).toEqual([1, 2, 3]);
  });
  it("keeps the first, the last and the neighbours, with a gap for the rest", () => {
    expect(pageList(1, 10)).toEqual([1, 2, "gap", 10]);
    expect(pageList(5, 10)).toEqual([1, "gap", 4, 5, 6, "gap", 10]);
    expect(pageList(10, 10)).toEqual([1, "gap", 9, 10]);
  });
});
