import { describe, expect, it } from "vitest";
import { movedSince } from "./stale";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("movedSince", () => {
  it("refuses only when the row showed a different status from the one stored now", () => {
    expect(movedSince(form({ status: "contacted", from: "new" }), "new")).toBe(false);
    expect(movedSince(form({ status: "contacted", from: "new" }), "appointment")).toBe(true);
    expect(movedSince(form({ status: "contacted" }), "appointment")).toBe(false);
  });
});
