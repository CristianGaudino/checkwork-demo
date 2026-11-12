import { describe, expect, it } from "vitest";
import { KM_PER_MILE, formatMileage } from "./units";

describe("mileage", () => {
  it("shows km as stored, or miles rounded to the nearest mile, with the site's number format", () => {
    expect(formatMileage(112300, "km")).toBe("112,300 km");
    expect(formatMileage(112300, "miles")).toBe("69,780 miles");
    expect(formatMileage(Math.round(1000 * KM_PER_MILE), "miles")).toBe("1,000 miles");
    expect(formatMileage(0, "miles")).toBe("0 miles");
  });
});
