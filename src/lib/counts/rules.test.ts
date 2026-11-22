import { describe, expect, it } from "vitest";
import { countId, isCountEvent } from "./rules";

describe("the counter allow-list", () => {
  it("takes the named buyer events on the public endpoint, and nothing else", () => {
    for (const e of ["saved", "compare", "finance", "units", "no-results", "contact-topic", "filter:fuel", "filter:km", "visit:facebook", "band:over-50k", "missed:tesla", "missed:other"]) expect(isCountEvent(e)).toBe(true);
    for (const e of ["dash:leads", "filter:colour", "dash:", "visit:myspace", "missed:087 123 4567", "saved ", "SAVED", "", "a@b.ie", 7, null, undefined, { event: "saved" }]) expect(isCountEvent(e)).toBe(false);
  });
  it("keeps one record a day for an event", () => {
    expect(countId("2026-11-16", "filter:fuel")).toBe("2026-11-16:filter:fuel");
  });
});
