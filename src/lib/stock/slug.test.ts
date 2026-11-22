import { expect, it } from "vitest";
import { slugify } from "./slug";

it("makes a URL-safe slug", () => {
  expect(slugify("Citroën C3 Aircross")).toBe("citroen-c3-aircross");
  expect(slugify("  Mercedes-Benz / A 200 ")).toBe("mercedes-benz-a-200");
});
