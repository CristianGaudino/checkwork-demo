import { describe, expect, it } from "vitest";
import { aOrAn, carEditSummary, costText } from "./activity-text";

const car = { make: "Hyundai", model: "Tucson", priceEur: 17950, mileageKm: 90000, colour: "Grey", features: ["Sat nav"] };

describe("carEditSummary", () => {
  it("names the price in full and the rest by name", () => {
    expect(carEditSummary(car, { ...car, priceEur: 16950 })).toBe("Changed the price from €17,950 to €16,950");
    expect(carEditSummary(car, { ...car, priceEur: 16950, mileageKm: 91000, colour: "Red" })).toBe("Changed the price from €17,950 to €16,950, and the mileage and colour");
    expect(carEditSummary(car, { ...car, features: ["Sat nav", "Heated seats"] })).toBe("Changed the equipment");
  });
  it("says so when nothing changed, and treats a cleared field as a change", () => {
    expect(carEditSummary(car, { ...car })).toBe("Saved the car with no changes");
    expect(carEditSummary(car, { ...car, colour: undefined })).toBe("Changed the colour");
  });
});

describe("aOrAn", () => {
  it("picks the article by the first letter", () => {
    expect([aOrAn("Instagram"), aOrAn("Facebook"), aOrAn("TikTok")]).toEqual(["an Instagram", "a Facebook", "a TikTok"]);
  });
});

describe("costText", () => {
  it("says what happened to the cost, and nothing when it did not change", () => {
    expect(costText(undefined, 11500)).toBe("Set the cost to €11,500");
    expect(costText(12000, 11500)).toBe("Changed the cost from €12,000 to €11,500");
    expect(costText(12000, null)).toBe("Cleared the cost");
    expect(costText(12000, 12000)).toBeNull();
    expect(costText(undefined, null)).toBeNull();
  });
});
