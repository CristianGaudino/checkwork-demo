import { describe, expect, it } from "vitest";
import { emailHas, parseRole, roleCan } from "./permission-rules";

describe("roles", () => {
  it("reads only a real role, the owner otherwise", () => {
    expect(parseRole("Sales")).toBe("Sales");
    expect(parseRole("sales")).toBe("Owner");
    expect(parseRole(undefined)).toBe("Owner");
  });
  it("grants what each role has, and nothing to no role", () => {
    expect(["Owner", "Manager", "Finance", "Sales"].map((r) => roleCan(r as never, "margins"))).toEqual([true, true, true, false]);
    expect(["Owner", "Manager", "Finance", "Sales"].map((r) => roleCan(r as never, "team"))).toEqual([true, true, false, false]);
    expect(roleCan(null, "margins")).toBe(false);
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
