import { describe, expect, it } from "vitest";
import { carFromForm } from "./car-form";
import { carSlug, nextCarId, slugify } from "./stock-admin-pure";
import type { Car } from "@/lib/stock/types";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries({ make: "Škoda", model: "Octavia estate", year: "2019", priceEur: "14950", status: "for-sale", ...o })) f.set(k, v);
  return f;
};

describe("slugs and ids", () => {
  it("slugifies accents and punctuation", () => {
    expect(slugify("Škoda")).toBe("skoda");
    expect(slugify("  C-Class (W205) ")).toBe("c-class-w205");
  });
  it("builds the slug from make, model, year and id, and takes the next id up", () => {
    expect(carSlug({ make: "Škoda", model: "Octavia estate", year: 2019, id: "7" })).toBe("skoda-octavia-estate-2019-7");
    expect(nextCarId([{ id: "4359693" }, { id: "12" }] as Car[])).toBe("4359694");
    expect(nextCarId([])).toBe("1");
  });
});

describe("carFromForm", () => {
  it("makes a car from the minimum, with empty boxes left out and not zero", () => {
    const r = carFromForm(form({ mileageKm: "", variant: "", wasPriceEur: "" }), "42");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.car).toMatchObject({ id: "42", slug: "skoda-octavia-estate-2019-42", makeSlug: "skoda", modelSlug: "octavia-estate", priceEur: 14950, photos: [] });
    expect(r.car).not.toHaveProperty("mileageKm");
    expect(r.car).not.toHaveProperty("soldAt");
  });
  it("reads features one per line and the VAT and drop fields", () => {
    const r = carFromForm(form({ features: "Sat Nav\n\n  Heated seats \n", vat: "ex", wasPriceEur: "16000", bodyType: "Estate" }), "1");
    expect(r.ok && r.car.features).toEqual(["Sat Nav", "Heated seats"]);
    expect(r.ok && r.car).toMatchObject({ vat: "ex", wasPriceEur: 16000, bodySlug: "estate" });
  });
  it("rejects bad input with a message per field", () => {
    const r = carFromForm(form({ make: " ", year: "1850", priceEur: "12.5", nctExpiry: "07/2027" }), "1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["make", "nctExpiry", "priceEur", "year"]);
  });
  it("keeps the photos of the car being edited, and stamps sold once", () => {
    const existing = { photos: [{ src: "/stock/a.webp", width: 1, height: 1 }], soldAt: "2026-01-02" } as Car;
    const r = carFromForm(form({ status: "sold" }), "1", existing, "2026-11-10");
    expect(r.ok && r.car.photos).toHaveLength(1);
    expect(r.ok && r.car.soldAt).toBe("2026-01-02");
    const fresh = carFromForm(form({ status: "sold" }), "1", undefined, "2026-11-10");
    expect(fresh.ok && fresh.car.soldAt).toBe("2026-11-10");
    const back = carFromForm(form({ status: "for-sale" }), "1", existing);
    expect(back.ok && back.car).not.toHaveProperty("soldAt");
  });
});
