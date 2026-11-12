import { describe, expect, it } from "vitest";
import type { Car } from "@/lib/stock/types";
import { carCards } from "./car-cards";

describe("car cards", () => {
  it("carry the name, first photo, price, days in stock and a hint where given", () => {
    const cars = [
      { id: "1", slug: "a", make: "Kia", model: "Niro", year: 2021, priceEur: 21450, photos: [{ src: "/a.jpg", width: 1, height: 1 }], listedAt: "2026-11-02" },
      { id: "2", slug: "b", make: "Ford", model: "Focus", year: 2019, priceEur: 9950, photos: [] },
    ] as unknown as Car[];
    const [a, b] = carCards(cars, new Map([["a", "New this week"]]), Date.parse("2026-11-12T10:00:00Z"));
    expect(a).toMatchObject({ slug: "a", photo: "/a.jpg", price: "€21,450", days: 10, hint: "New this week" });
    expect(a.title).toContain("Kia Niro");
    expect(b).not.toHaveProperty("days");
    expect(b).not.toHaveProperty("hint");
    expect(b.photo).toBeUndefined();
  });
});
