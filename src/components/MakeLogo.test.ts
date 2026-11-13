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

describe("BRAND_LOGOS", () => {
  it("has a file in public/brands for every make it lists", async () => {
    const { existsSync } = await import("node:fs");
    const { BRAND_LOGOS } = await import("@/lib/brand-logos");
    expect([...BRAND_LOGOS].filter((s) => !existsSync(`public/brands/${s}.svg`))).toEqual([]);
  });
});
