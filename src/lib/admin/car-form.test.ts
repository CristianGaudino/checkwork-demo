import { describe, expect, it } from "vitest";
import { carFromForm } from "./car-form";
import { carSlug, carStatus, nextCarId, slugify } from "./stock-admin-pure";
import type { Car } from "@/lib/stock/types";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries({ make: "Škoda", model: "Octavia estate", year: "2019", priceEur: "14950", listing: "live", ...o })) f.set(k, v);
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
    // An id a sale still names is not given out again, even with its car deleted.
    expect(nextCarId([{ id: "12" }, { id: "13" }])).toBe("14");
  });
});

describe("carFromForm", () => {
  it("takes 0 as Price on request, and an empty price as a mistake", () => {
    expect(carFromForm(form({ priceEur: "0" }), "1")).toMatchObject({ car: { priceEur: 0 } });
    expect(carFromForm(form({ priceEur: "" }), "1")).toMatchObject({ errors: { priceEur: "Enter the price" } });
  });
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
  it("keeps CO2 and motor tax for any car, and the battery figures only for a car with a plug", () => {
    const ev = { co2GKm: "0", motorTaxEur: "120", evRangeKm: "270", batteryKwh: "40", acChargeKw: "6.6", dcChargeKw: "50", charge10To80Mins: "45" };
    expect(carFromForm(form({ ...ev, fuel: "electric" }), "1")).toMatchObject({ ok: true, car: { co2GKm: 0, motorTaxEur: 120, evRangeKm: 270, batteryKwh: 40, acChargeKw: 6.6, dcChargeKw: 50, charge10To80Mins: 45 } });
    expect(carFromForm(form({ ...ev, fuel: "plug-in-hybrid" }), "1")).toMatchObject({ car: { evRangeKm: 270 } });
    // Changing the fuel to petrol clears what the car had, the stored figures included.
    const petrol = carFromForm(form({ ...ev, fuel: "petrol" }), "1", { evRangeKm: 270, batteryKwh: 40, photos: [] } as unknown as Car);
    expect(petrol.ok && petrol.car).toMatchObject({ co2GKm: 0, motorTaxEur: 120 });
    for (const k of ["evRangeKm", "batteryKwh", "acChargeKw", "dcChargeKw", "charge10To80Mins"]) expect(petrol.ok && petrol.car).not.toHaveProperty(k);
  });
  it("refuses battery, charging, CO2 and tax figures out of range", () => {
    const r = carFromForm(form({ fuel: "electric", co2GKm: "-1", motorTaxEur: "12.5", evRangeKm: "0", batteryKwh: "400", acChargeKw: "abc", dcChargeKw: "5000", charge10To80Mins: "2.5" }), "1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["acChargeKw", "batteryKwh", "charge10To80Mins", "co2GKm", "dcChargeKw", "evRangeKm", "motorTaxEur"]);
  });
  it("rejects bad input with a message per field", () => {
    const r = carFromForm(form({ make: " ", year: "1850", priceEur: "12.5", nctExpiry: "07/2027" }), "1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["make", "nctExpiry", "priceEur", "year"]);
  });
  it("keeps the photos and the sale of the car being edited: the form never sells or unsells a car", () => {
    const existing = { photos: [{ src: "/stock/a.webp", width: 1, height: 1 }], soldAt: "2026-01-02" } as Car;
    const r = carFromForm(form({ status: "for-sale" }), "1", existing, "2026-11-10");
    expect(r.ok && r.car.photos).toHaveLength(1);
    expect(r.ok && r.car.soldAt).toBe("2026-01-02");
    expect(carFromForm(form({ status: "sold" }), "1", undefined, "2026-11-10")).toMatchObject({ ok: true, car: { listedAt: "2026-11-10" } });
    expect(carFromForm(form({ status: "sold" }), "1")).not.toHaveProperty("car.soldAt");
  });
  it("hides a car or keeps it as a draft, and a draft gets its listing date when it is published", () => {
    const draft = carFromForm(form({ listing: "draft" }), "7", undefined, "2026-11-01");
    expect(draft.ok && draft.car).toMatchObject({ listing: "draft" });
    expect(draft.ok && draft.car).not.toHaveProperty("listedAt");
    const published = carFromForm(form({}), "7", draft.ok ? draft.car : undefined, "2026-11-12");
    expect(published.ok && published.car).toMatchObject({ listedAt: "2026-11-12" });
    expect(published.ok && published.car).not.toHaveProperty("listing");
    const hidden = carFromForm(form({ listing: "hidden" }), "7", published.ok ? published.car : undefined, "2026-11-20");
    expect(hidden.ok && hidden.car).toMatchObject({ listing: "hidden", listedAt: "2026-11-12" });
    const shownAgain = carFromForm(form({}), "7", hidden.ok ? hidden.car : undefined, "2026-11-25");
    expect(shownAgain.ok && shownAgain.car.listedAt).toBe("2026-11-12");
    expect(carFromForm(form({ listing: "public" }), "7").ok).toBe(false);
  });
});

describe("listing date", () => {
  it("is set to today when a car is added, and an edit never moves it", () => {
    const added = carFromForm(form({}), "50", undefined, "2026-11-11");
    expect(added.ok && added.car.listedAt).toBe("2026-11-11");
    const existing = { ...(added.ok ? added.car : ({} as Car)), listedAt: "2026-09-01" };
    const edited = carFromForm(form({ priceEur: "9999" }), "50", existing, "2026-11-11");
    expect(edited.ok && edited.car.listedAt).toBe("2026-09-01");
    // A car from before dates were kept is not stamped as listed today by an edit.
    const undated = { ...existing, listedAt: undefined };
    const editedUndated = carFromForm(form({ priceEur: "9999" }), "50", undated, "2026-11-11");
    expect(editedUndated.ok && editedUndated.car.listedAt).toBeUndefined();
  });
});

describe("carStatus", () => {
  it("puts off the website first, then sold, reserved, for sale", () => {
    expect(carStatus({ listing: "draft", soldAt: "2026-01-01" })).toBe("Draft");
    expect(carStatus({ listing: "hidden", reserved: true })).toBe("Hidden");
    expect(carStatus({ soldAt: "2026-01-01", reserved: true })).toBe("Sold");
    expect(carStatus({ reserved: true })).toBe("Reserved");
    expect(carStatus({})).toBe("For sale");
  });
});
