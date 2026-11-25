import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CarMeta } from "./CarMeta";

const text = (car: Parameters<typeof CarMeta>[0]["car"]) => renderToStaticMarkup(createElement(CarMeta, { car })).replace(/<[^>]+>/g, "");

describe("CarMeta", () => {
  it("builds the details line in km at first paint, and drops missing parts with their separator", () => {
    expect(text({ year: 2019, mileageKm: 84000, fuel: "diesel", gearbox: "manual" })).toBe("2019 · 84,000 km · Diesel · Manual");
    expect(text({ year: 2019, gearbox: "manual" })).toBe("2019 · Manual");
    // A feed's blank mileage arrives as 0: unknown on every vehicle, a commercial included.
    expect(text({ year: 2019, mileageKm: 0, gearbox: "manual" })).toBe("2019 · Manual");
    expect(text({ year: 2026, mileageKm: 0, condition: "commercial", owners: 0 })).toBe("2026");
  });
});
