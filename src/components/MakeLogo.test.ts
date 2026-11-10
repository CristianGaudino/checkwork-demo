import { describe, expect, it } from "vitest";
import { initialsOf } from "./MakeLogo";

describe("initialsOf", () => {
  it("takes the first letters of a make's words", () => {
    expect(initialsOf("land-rover")).toBe("LR");
    expect(initialsOf("aston-martin")).toBe("AM");
    expect(initialsOf("mercedes-benz")).toBe("MB");
  });
  it("keeps a short name and shortens a long one to two letters", () => {
    expect(initialsOf("gmc")).toBe("GMC");
    expect(initialsOf("dodge")).toBe("DO");
    expect(initialsOf("genesis")).toBe("GE");
  });
  it("is empty for nothing", () => {
    expect(initialsOf("")).toBe("");
  });
});
