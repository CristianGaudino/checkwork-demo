import { describe, expect, it } from "vitest";
import { longTitle } from "./title";

describe("car page title", () => {
  it("steps down on a phone when a word is over nine characters or the name is over 24", () => {
    expect(longTitle({ make: "Audi", model: "A4" })).toBe(false);
    expect(longTitle({ make: "Volkswagen", model: "Golf" })).toBe(true); // ten letters would split mid-word at 320px
    expect(longTitle({ make: "Mercedes-Benz", model: "C" })).toBe(true);
    expect(longTitle({ make: "Ford", model: "Transit Custom Van Extra" })).toBe(true); // 29 characters
    expect(longTitle({ make: "Ford", model: "Transit Connect" })).toBe(false);
  });
});
