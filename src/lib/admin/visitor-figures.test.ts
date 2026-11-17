import { describe, expect, it } from "vitest";
import { NOT_KNOWN, visitorFigures } from "./visitor-figures";

describe("visitorFigures", () => {
  const f = visitorFigures({
    counts: { "visit:google": 60, "visit:facebook": 30, "visit:direct": 10, "no-results": 4, "missed:tesla": 3, "missed:other": 1, "filter:fuel": 9, "filter:make": 12, "band:10k-20k": 5, "band:under-10k": 2, finance: 7, saved: 99 },
    leads: [
      { type: "enquiry", source: "Website", channel: "Facebook" },
      { type: "finance", source: "Website", channel: "Facebook" },
      { type: "enquiry", source: "Website", channel: "Google" },
      { type: "enquiry", source: "Website" }, // before tracking
      { type: "enquiry", source: "Phone" }, // not a website lead
      { type: "finance", source: "Phone" }, // typed in by staff, not an application on the site
    ],
    alerts: [
      { kind: "price-drop", criteria: "2021 Skoda Octavia", active: true },
      { kind: "back-in-stock", criteria: "2021 Skoda Octavia", active: true },
      { kind: "price-drop", criteria: "2020 Audi A3", active: true },
      { kind: "price-drop", criteria: "2020 Audi A3", active: false },
      { kind: "new-arrival", criteria: "Any SUV", active: true },
    ],
  });

  it("adds the visits up by channel, with the website leads each brought, and keeps leads with no channel", () => {
    expect(f.totals).toEqual({ visits: 100, leads: 4, conversion: 4 });
    expect(f.sources).toEqual([
      { name: "Google", visits: 60, leads: 1 },
      { name: "Facebook", visits: 30, leads: 2 },
      { name: "Typed in or bookmarked", visits: 10, leads: 0 },
      { name: NOT_KNOWN, visits: 0, leads: 1 },
    ]);
  });

  it("names the makes searched with no results, the filters and the price bands", () => {
    expect(f.noResults).toEqual({ count: 4, makes: [{ label: "Tesla", value: 3 }, { label: "Other searches", value: 1 }] });
    expect(f.filters).toEqual([{ label: "Make", value: 12 }, { label: "Fuel", value: 9 }]);
    expect(f.bands.map((b) => b.label)).toEqual(["Up to €10,000", "€10,000 to €20,000"]); // in price order, not by count
  });

  it("counts finance and the active alerts per car, leaving out new-arrival ones", () => {
    expect(f.finance).toEqual({ calculator: 7, applications: 1 });
    expect(f.alertsPerCar).toEqual([{ label: "2021 Skoda Octavia", value: 2 }, { label: "2020 Audi A3", value: 1 }]);
  });
});
