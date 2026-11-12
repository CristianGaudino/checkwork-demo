import { describe, expect, it } from "vitest";
import { telHref, waHref } from "./phone";

describe("phone links", () => {
  it("dials an Irish number however it was typed", () => {
    for (const typed of ["087 123 4567", "+353 87 123 4567", "00353871234567", "(087) 123-4567"]) expect(telHref(typed)).toBe("tel:+353871234567");
    expect(waHref("087 123 4567")).toBe("https://wa.me/353871234567");
  });
  it("keeps a foreign number and gives nothing for an empty or short one", () => {
    expect(waHref("+44 7700 900123")).toBe("https://wa.me/447700900123");
    expect(telHref("")).toBeNull();
    expect(waHref("12345")).toBeNull();
  });
});
