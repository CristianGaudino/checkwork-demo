import { describe, expect, it } from "vitest";
import type { Car } from "@/lib/stock/types";
import { writeNewsletter, writePost } from "./marketing";

const voice = { voice: "Plain.", hashtags: "#usedcars", signOff: "Call in to see it." };
const car = { id: "1", slug: "ford-focus-2019-1", make: "Ford", model: "Focus", variant: "1.0 Titanium", year: 2019, priceEur: 13950, mileageKm: 129999, fuel: "petrol", gearbox: "manual", photos: [] } as unknown as Car;

describe("writePost", () => {
  it("uses only the car's own facts and price", () => {
    const t = writePost(car, "Facebook", voice);
    expect(t).toContain("Just in: 2019 Ford Focus 1.0 Titanium.");
    expect(t).toContain("129,999 km, Petrol, Manual");
    expect(t).toContain("€13,950");
    expect(t).toContain("/used-cars/ford-focus-2019-1");
    expect(t).not.toContain("#usedcars");
  });
  it("says the VAT status when the car has one", () => {
    expect(writePost({ ...car, vat: "ex" }, "Facebook", voice)).toContain("€13,950 Ex. VAT, reclaimable");
  });
  it("puts a link in the bio and the hashtags on Instagram, and keeps TikTok short", () => {
    const ig = writePost(car, "Instagram", voice);
    expect(ig).toContain("Link in bio.");
    expect(ig.endsWith("#usedcars")).toBe(true);
    const tt = writePost(car, "TikTok", voice);
    expect(tt).not.toContain("Call in to see it.");
    expect(tt.endsWith("#usedcars")).toBe(true);
  });
  it("gives the same text for the same input", () => {
    expect(writePost(car, "Facebook", voice)).toBe(writePost(car, "Facebook", voice));
  });
});

describe("writeNewsletter", () => {
  it("lists each car with its price and link, then the sign-off", () => {
    const n = writeNewsletter([car], voice);
    expect(n.subject).toBe("New arrivals at Checkwork Motors");
    expect(n.body).toContain("- 2019 Ford Focus, €13,950.");
    expect(n.body.endsWith("Call in to see it.")).toBe(true);
  });
  it("still makes sense with no cars", () => {
    const n = writeNewsletter([], voice);
    expect(n.subject).toBe("News from Checkwork Motors");
    expect(n.body).toBe("Call in to see it.");
  });
});
