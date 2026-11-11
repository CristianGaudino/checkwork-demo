import { describe, expect, it } from "vitest";
import { matchesPerson, parsePersonQuery } from "./person-match";

describe("finding a person", () => {
  it("takes an email or a phone, and nothing too short to be either", () => {
    expect(parsePersonQuery(" Pat@Example.com ")).toEqual({ email: "pat@example.com" });
    expect(parsePersonQuery("087 123 4567")).toEqual({ phone: "871234567" });
    expect(parsePersonQuery("Pat")).toBeNull();
    expect(parsePersonQuery("12345")).toBeNull();
  });
  it("matches a phone however it was written, and an email whatever its case", () => {
    const q = parsePersonQuery("+353 87 123 4567")!;
    for (const phone of ["087 123 4567", "0871234567", "00353 87 123 4567", "+353871234567"]) expect(matchesPerson({ phone }, q)).toBe(true);
    expect(matchesPerson({ phone: "087 123 4568" }, q)).toBe(false);
    expect(matchesPerson({ phone: "" }, q)).toBe(false);
    expect(matchesPerson({ email: "PAT@example.com " }, parsePersonQuery("pat@example.com")!)).toBe(true);
    expect(matchesPerson({ email: "pat@example.co" }, parsePersonQuery("pat@example.com")!)).toBe(false);
  });
});

describe("widen", () => {
  it("adds the other details a person's records hold, once each", async () => {
    const { widen } = await import("./person-match");
    const q = parsePersonQuery("pat@example.com")!;
    expect(widen([q], [{ email: "Pat@example.com", phone: "087 123 4567" }, { email: "pat@example.com", phone: "+353 87 123 4567" }])).toEqual([q, { phone: "871234567" }]);
  });
});
