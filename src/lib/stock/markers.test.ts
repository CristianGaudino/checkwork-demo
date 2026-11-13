import { describe, expect, it } from "vitest";
import demo from "./demo-cars.json";
import extra from "./demo-cars-extra.json";
import { rareMarker } from "./markers";
import type { Car } from "./types";

const now = new Date("2026-11-11T12:00:00Z");
const used = (o: Partial<Car>) => ({ condition: "used" as const, year: 2015, mileageKm: 150000, owners: 3, ...o });

describe("rare markers", () => {
  it("very low mileage: under 5,000 km a year, on a car three years old or more", () => {
    expect(rareMarker(used({ year: 2016, mileageKm: 40000 }), now)).toBe("Very low mileage");
    // A 2023 car in 2026 may be just over two years old: 14,000 km is 7,000 a year at worst, ordinary, so no marker.
    expect(rareMarker(used({ year: 2023, mileageKm: 14000 }), now)).toBeUndefined();
    expect(rareMarker(used({ year: 2022, mileageKm: 14000 }), now)).toBe("Very low mileage"); // at least three full years
    expect(rareMarker(used({ year: 2016, mileageKm: 60000 }), now)).toBeUndefined(); // 6,000 a year: good, not rare
    expect(rareMarker(used({ year: 2025, mileageKm: 2000 }), now)).toBeUndefined(); // a young car with few km is normal
  });

  it("one owner from new, only on a car ten years old or more", () => {
    expect(rareMarker(used({ year: 2014, owners: 1 }), now)).toBe("One owner");
    expect(rareMarker(used({ year: 2020, owners: 1 }), now)).toBeUndefined();
  });

  it("never on a new car, a van or a sold car", () => {
    expect(rareMarker({ ...used({ year: 2016, mileageKm: 1000 }), condition: "new" }, now)).toBeUndefined();
    expect(rareMarker({ ...used({ year: 2016, mileageKm: 1000 }), condition: "commercial" }, now)).toBeUndefined();
    expect(rareMarker(used({ year: 2016, mileageKm: 1000, soldAt: "2026-11-01" }), now)).toBeUndefined();
  });

  it("stays rare in the demo stock: at most one car in ten", () => {
    const live = ([...demo, ...extra] as Car[]).filter((c) => !c.soldAt);
    const marked = live.filter((c) => rareMarker(c, now));
    expect(marked.length).toBeLessThanOrEqual(Math.ceil(live.length / 10));
  });
});

describe("miles", () => {
  it("shows a mileage in miles, rounded, or in km as stored", async () => {
    const { formatMileage } = await import("@/lib/units");
    expect(formatMileage(104800, "km")).toBe("104,800 km");
    expect(formatMileage(104800, "miles")).toBe("65,120 miles");
    expect(formatMileage(0, "miles")).toBe("0 miles");
  });
});
