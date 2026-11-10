import { describe, expect, it } from "vitest";
import { emailHas, parsePerms } from "./permission-rules";

describe("parsePerms", () => {
  it("keeps only the permissions that exist", () => {
    expect(parsePerms("margins")).toEqual(["margins"]);
    expect(parsePerms("margins,root,")).toEqual(["margins"]);
    expect(parsePerms(undefined)).toEqual([]);
    expect(parsePerms("MARGINS")).toEqual([]);
  });
});

describe("emailHas", () => {
  it("matches a listed address, ignoring case and spaces", () => {
    expect(emailHas("a@dealer.ie, B@dealer.ie ", "b@dealer.ie")).toBe(true);
    expect(emailHas("a@dealer.ie", "c@dealer.ie")).toBe(false);
  });
  it("grants nothing to nobody or to an empty list", () => {
    expect(emailHas("a@dealer.ie", "")).toBe(false);
    expect(emailHas(undefined, "a@dealer.ie")).toBe(false);
    expect(emailHas("", "")).toBe(false);
  });
});
