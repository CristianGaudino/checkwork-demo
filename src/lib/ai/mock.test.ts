import { describe, expect, it } from "vitest";
import { mockText } from "./mock";
import { ADJUSTS, adjustsFor, type Adjust, type CarFacts, type FactsOf } from "./tasks";

const car: CarFacts = { name: "2019 Ford Focus 1.0 Titanium", year: 2019, mileageKm: 129999, fuel: "Petrol", gearbox: "Manual", body: "Hatchback", engineLitres: 1, colour: "Blue", doors: 5, seats: 5, owners: 2, nctExpiry: "2027-07", price: "€13,950 Inc. VAT", was: "€14,450", features: ["Bluetooth", "Parking sensors", "Cruise control"], link: "https://x.test/used-cars/ford-focus" };
const voice = { signOff: "Call in to see it.", hashtags: "#usedcars" };
const post = (o: Partial<FactsOf["post"]> = {}): FactsOf["post"] => ({ dealer: "Checkwork Motors", car, network: "Facebook", format: "post", voice, ...o });
// Words a made-up car record never holds: the writer must not bring them.
const INVENTED = /warranty|service history|full history|one owner|finance|apr|per month|a month|guarantee|accident|mint|immaculate/i;

describe("the demo writer", () => {
  it("gives the same text for the same facts and button", () => {
    for (const a of [undefined, ...(Object.keys(ADJUSTS) as Adjust[])]) expect(mockText("post", post(), a, "x")).toBe(mockText("post", post(), a, "x"));
  });

  it("has no em or en dashes, even when a fact carries one", () => {
    const dashy = post({ car: { ...car, name: "2019 Ford Focus — Titanium", features: ["Roof – panoramic"] } });
    for (const a of [undefined, "detail"] as const) expect(mockText("post", dashy, a)).not.toMatch(/[—–]/);
  });

  it("each post button gives a different text from the plain draft", () => {
    const plain = mockText("post", post());
    const seen = new Set([plain]);
    for (const a of adjustsFor("post")) {
      const t = mockText("post", post(), a, plain);
      expect(t, a).not.toBe(plain);
      seen.add(t);
    }
    expect(seen.size).toBe(adjustsFor("post").length + 1);
  });

  it("builds a post only from the car's facts: no history, warranty or finance terms, and no figure that is not in the record", () => {
    for (const a of [undefined, ...adjustsFor("post")]) {
      const t = mockText("post", post({ car: { ...car, owners: undefined } }), a);
      expect(t).not.toMatch(INVENTED);
      const figures = t.match(/[\d,.]+/g) ?? [];
      const allowed = JSON.stringify(car) + "129,999 13,950 14,450";
      for (const f of figures) expect(allowed, `${a}: ${f}`).toContain(f.replace(/[.,]+$/, ""));
    }
  });

  it("writes a story for each ready layout, short, and never states a price on Sold", () => {
    const story = (layout: FactsOf["post"]["layout"]) => mockText("post", post({ format: "story", layout }));
    expect(story("just-in")).toMatch(/^Just in: /);
    expect(story("price-drop")).toContain("Now €13,950 Inc. VAT, was €14,450");
    expect(story("collected")).toMatch(/^Collected today/);
    expect(story("sold")).not.toContain("€");
    expect(story("just-in").length).toBeLessThan(120);
    expect(adjustsFor("post", "story")).toEqual(["shorter", "urgency"]);
  });

  it("adds hashtags to the text it is given, and urgency, without losing it", () => {
    expect(mockText("post", post(), "hashtags", "My own words.")).toMatch(/^My own words\.\n#Ford #Focus/);
    expect(mockText("post", post(), "urgency", "My own words.")).toMatch(/^My own words\.\nMessage us today/);
  });

  it("writes the other tasks from their records and changes with each button", () => {
    const desc: FactsOf["carDescription"] = { dealer: "D", car, notes: "Two keys." };
    const base = mockText("carDescription", desc);
    expect(base).toContain("Two keys.");
    for (const a of adjustsFor("carDescription")) expect(mockText("carDescription", desc, a), a).not.toBe(base);
    expect(mockText("carDescription", desc, "family")).toContain("5 seats");
    expect(mockText("carDescription", desc, "detail")).toContain("NCT to 2027-07");
    expect(mockText("carDescription", { dealer: "D", car: { name: "2020 Kia Rio" } })).not.toMatch(INVENTED);

    const lead: FactsOf["leadReply"] = { dealer: "D", firstName: "Aoife", kind: "Car enquiry", message: "Is it available?", car: "2019 Ford Focus" };
    const reply = mockText("leadReply", lead);
    expect(reply).toContain("Hi Aoife");
    expect(reply).not.toMatch(/@|\+?\d{7}/); // no contact details
    for (const a of adjustsFor("leadReply")) expect(mockText("leadReply", lead, a), a).not.toBe(reply);

    const bad: FactsOf["reviewReply"] = { dealer: "D", firstName: "Sam", rating: 2, text: "Slow." };
    expect(mockText("reviewReply", bad)).toContain("sorry");
    expect(mockText("reviewReply", { ...bad, rating: 5 })).toContain("kind words");
    expect(mockText("reviewReply", { ...bad, rating: 5 }, "apologetic")).toContain("sorry");
    expect(mockText("reviewReply", bad, "shorter").length).toBeLessThan(mockText("reviewReply", bad).length);

    const nl: FactsOf["newsletter"] = { dealer: "D", cars: [car], voice };
    for (const a of adjustsFor("newsletter")) expect(mockText("newsletter", nl, a), a).not.toBe(mockText("newsletter", nl));
  });
});
