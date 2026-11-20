import { describe, expect, it } from "vitest";
import { carName, carTitle, countLabel, formatKm, fmtEur, keyFacts, specRows, withoutInvitation } from "./format";
import { isNew } from "./types";
import type { Car } from "./types";

const audi: Car = {
  id: "101",
  slug: "audi-a4-2019-101",
  make: "Audi",
  makeSlug: "audi",
  model: "A4",
  modelSlug: "a4",
  variant: "2.0 TDI S line",
  year: 2019,
  priceEur: 18950,
  mileageKm: 84000,
  fuel: "diesel",
  gearbox: "manual",
  photos: [],
};

describe("formatters", () => {
  it("formats price and mileage as exact strings", () => {
    expect(fmtEur(18950)).toBe("€18,950");
    expect(formatKm(84000)).toBe("84,000 km");
  });

  it("builds the title and the name", () => {
    expect(carTitle(audi)).toBe("Audi A4 2.0 TDI S line");
    expect(carTitle({ ...audi, variant: undefined })).toBe("Audi A4");
    expect(carName(audi)).toBe("2019 Audi A4");
  });

  it("labels the result count", () => {
    expect(countLabel(0)).toBe("No cars");
    expect(countLabel(1)).toBe("1 car");
    expect(countLabel(24)).toBe("24 cars");
    expect(countLabel(1163)).toBe("1,163 cars");
  });
});

const full: Car = {
  ...audi,
  bodyType: "Saloon",
  engineLitres: 2,
  colour: "Grey",
  doors: 4,
  seats: 5,
  owners: 2,
  nctExpiry: "2027-07",
  maxSpeedMph: 126,
  zeroTo62Secs: 9.9,
};

describe("specRows", () => {
  it("lists every present spec in order with exact formats", () => {
    expect(specRows(full)).toEqual([
      { label: "Year", value: "2019" },
      { label: "Mileage", value: "84,000 km" },
      { label: "Fuel", value: "Diesel" },
      { label: "Transmission", value: "Manual" },
      { label: "Body type", value: "Saloon" },
      { label: "Engine", value: "2.0 L" },
      { label: "Colour", value: "Grey" },
      { label: "Doors", value: "4" },
      { label: "Seats", value: "5" },
      { label: "Owners", value: "2" },
      { label: "NCT expires", value: "Jul 2027" },
      { label: "Max speed", value: "203 km/h", miles: { label: "Max speed", value: "126 mph" } },
      { label: "0 to 100 km/h", value: "9.9 s", miles: { label: "0 to 62 mph", value: "9.9 s" } },
    ]);
    expect(specRows({ ...full, engineLitres: 1.5 }).find((r) => r.label === "Engine")?.value).toBe("1.5 L");
  });

  it("gives a car with only the required fields just Year, and never an empty value", () => {
    const bare: Car = { id: "1", slug: "a-b-2020-1", make: "A", makeSlug: "a", model: "B", modelSlug: "b", year: 2020, priceEur: 1, photos: [] };
    expect(specRows(bare)).toEqual([{ label: "Year", value: "2020" }]);
    for (const r of specRows({ ...full, nctExpiry: "soon" })) expect(r.value).not.toMatch(/undefined|^$/);
    expect(specRows({ ...full, nctExpiry: "soon" }).some((r) => r.label === "NCT expires")).toBe(false);
  });

  it("shows no Owners row for a new vehicle (0 owners)", () => {
    expect(specRows({ ...full, owners: 0 }).some((r) => r.label === "Owners")).toBe(false);
  });

  it("never shows a road tax row of its own: motor tax only as the dealer entered it", () => {
    expect(specRows(full).some((r) => /tax/i.test(r.label))).toBe(false);
    expect(specRows({ ...full, motorTaxEur: 180, co2GKm: 89 }).filter((r) => ["CO2", "Motor tax"].includes(r.label))).toEqual([
      { label: "CO2", value: "89 g/km" },
      { label: "Motor tax", value: "€180 a year" },
    ]);
  });

  it("shows an electric car's range, battery and charging, the range in miles too", () => {
    const leaf: Car = { ...full, fuel: "electric", engineLitres: undefined, co2GKm: 0, evRangeKm: 270, batteryKwh: 40, acChargeKw: 6.6, dcChargeKw: 50, charge10To80Mins: 45 };
    const rows = specRows(leaf);
    expect(rows.filter((r) => /Range|Battery|charg/.test(r.label))).toEqual([
      { label: "Range (WLTP)", value: "270 km", miles: { label: "Range (WLTP)", value: "168 miles" } },
      { label: "Battery", value: "40 kWh" },
      { label: "Max AC charging", value: "6.6 kW" },
      { label: "Max DC charging", value: "50 kW" },
      { label: "10 to 80% charge", value: "45 min" },
    ]);
    expect(rows.find((r) => r.label === "CO2")?.value).toBe("0 g/km"); // 0 is a figure, not a missing one
  });
});

describe("keyFacts", () => {
  it("is Year, Mileage, Fuel and Transmission when all are present", () => {
    expect(keyFacts(full).map((f) => f.label)).toEqual(["Year", "Mileage", "Fuel", "Transmission"]);
  });

  it("fills a missing slot from Body Type, Engine and Colour, at most 4", () => {
    expect(keyFacts({ ...full, mileageKm: undefined, fuel: undefined }).map((f) => f.label)).toEqual(["Year", "Transmission", "Body type", "Engine"]);
    expect(keyFacts({ ...full, mileageKm: undefined, fuel: undefined, gearbox: undefined, bodyType: undefined, engineLitres: undefined }).map((f) => f.label)).toEqual(["Year", "Colour"]);
  });
});

describe("featureLabel", () => {
  it("writes equipment in sentence case and keeps acronyms and brand names", async () => {
    const { featureLabel } = await import("./format");
    expect(featureLabel("Air Conditioning")).toBe("Air conditioning");
    expect(featureLabel("Dual Zone Climate Control")).toBe("Dual zone climate control");
    expect(featureLabel("DAB Radio")).toBe("DAB radio");
    expect(featureLabel("Android Auto")).toBe("Android Auto");
    expect(featureLabel("Stop/Start Button")).toBe("Stop/Start button");
  });
});

describe("plainText", () => {
  it("drops tags, keeps line breaks and decodes entities", async () => {
    const { plainText } = await import("./format");
    expect(plainText("FULL HISTORY <b>no accidents</b> &amp; one owner<br>NCT 2027")).toBe("FULL HISTORY no accidents & one owner\nNCT 2027");
    expect(plainText("<p></p>")).toBe("");
    expect(plainText("Price &lt; 10k")).toBe("Price < 10k");
  });
});

describe("withoutInvitation", () => {
  it("drops a closing paragraph that invites a visit, and keeps the rest", () => {
    const facts = "2017 Ford Fiesta, white.\n\nOne owner from new.";
    expect(withoutInvitation(`${facts}\n\nCall in to see it, or book a test drive. Part exchange welcome and finance available.`)).toBe(facts);
    expect(withoutInvitation(facts)).toBe(facts);
    expect(withoutInvitation("Call in to see it.")).toBe("Call in to see it."); // one paragraph only: never empties the text
    expect(withoutInvitation("One owner.\nCall in to see it.")).toBe("One owner."); // a feed's <p> or <br> becomes one line break
  });
});

describe("isNew", () => {
  it("is a new car, or a van with no previous owner", () => {
    expect(isNew({ condition: "new" })).toBe(true);
    expect(isNew({ condition: "commercial", owners: 0 })).toBe(true);
    expect(isNew({ condition: "commercial", owners: 3 })).toBe(false);
    expect(isNew({ condition: "commercial" })).toBe(false);
    expect(isNew({ owners: 0 })).toBe(false); // a used car on delivery mileage is still sold as used
  });
});
