import { describe, expect, it } from "vitest";
import { KM_PER_MILE } from "./stock/format";
import { formatMileage } from "./units";

describe("mileage", () => {
  it("shows km as stored, or miles to the nearest hundred (to the mile under 1,000), with the site's number format", () => {
    expect(formatMileage(112300, "km")).toBe("112,300 km");
    expect(formatMileage(112300, "miles")).toBe("69,800 miles");
    expect(formatMileage(82300, "miles")).toBe("51,100 miles");
    expect(formatMileage(9, "miles")).toBe("6 miles");
    expect(formatMileage(800, "miles")).toBe("497 miles");
    expect(formatMileage(Math.round(1000 * KM_PER_MILE), "miles")).toBe("1,000 miles");
    expect(formatMileage(0, "miles")).toBe("0 miles");
  });
});
