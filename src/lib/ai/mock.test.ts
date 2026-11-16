import { describe, expect, it } from "vitest";
import { mockText } from "./mock";
import { ADJUSTS, adjustsFor, maskContacts, noContacts, unmaskContacts, type Adjust, type CarFacts, type FactsOf } from "./tasks";

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

  it("writes a story for each ready layout, short", () => {
    const story = (layout: FactsOf["post"]["layout"]) => mockText("post", post({ format: "story", layout }));
    expect(story("just-in")).toMatch(/^Just in: /);
    expect(story("price-drop")).toContain("Now €13,950 Inc. VAT, was €14,450");
    expect(story("just-in").length).toBeLessThan(120);
    expect(adjustsFor("post", "story")).toEqual(["shorter", "urgency"]);
  });

  it("adds hashtags to the text it is given, and urgency, without losing it", () => {
    expect(mockText("post", post(), "hashtags", "My own words.")).toMatch(/^My own words\.\n#Ford #Focus/);
    expect(mockText("post", post(), "urgency", "My own words.")).toMatch(/^My own words\.\nMessage us today/);
    for (const a of ["urgency", "hashtags"] as const) {
      const once = mockText("post", post(), a, "My own words.");
      expect(mockText("post", post(), a, once)).toBe(once); // not added a second time
    }
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

describe("what goes to the AI provider", () => {
  it("takes phone numbers and emails out of a customer's message", () => {
    expect(noContacts("Call 087 123 4567 or +353 87 765 4321, or mail pat.b@example.ie. Is the 2019 car still there?")).toBe("Call [phone] or [phone], or mail [email]. Is the 2019 car still there?");
    expect(noContacts("Ring 087/1234567 or (087) 123 4567, mail seán.óg@example.ie")).toBe("Ring [phone] or [phone], mail [email]");
  });
  it("keeps registrations, dates, times, budgets, mileage and prices", () => {
    const kept = "191-D-12345, 06-D-1234567, 22-11-2026, 23.11.2026, Saturday 10.30 - 11.30, 2019 2020 model, 85,000 km, 120 000 km, €12,500";
    expect(noContacts(kept)).toBe(kept);
    for (const t of ["Can I view it on 14/06/2025 14:00?", "192 Toyota 2019 2020 2021", "Write to me (pat@x.ie) today"]) expect(noContacts(t)).toBe(t.replace("pat@x.ie", "[email]"));
  });
  it("puts the dealer's own number and email back after an adjust, in order", () => {
    const m = maskContacts("Sales 01 111 2222, Service 01 333 4444, mail sales@dealer.ie", true);
    expect(m.text).toBe("Sales [phone 1], Service [phone 2], mail [email 1]");
    expect(unmaskContacts("For a service, call [phone 2] or email [email 1].", m)).toBe("For a service, call 01 333 4444 or email sales@dealer.ie.");
    // A customer's number, masked plain in the facts, never gets the dealer's
    expect(unmaskContacts("We'll ring you on [phone]. Or call us on [phone 1].", m)).toBe("We'll ring you on [phone]. Or call us on 01 111 2222.");
  });
  it("takes out a number that follows a date", () => {
    expect(noContacts("Viewing 14/06/2025 087 123 4567")).not.toContain("123 4567");
    for (const t of ["Ring 087-12-34567", "Mob 087-1-234567", "01.23.45678"]) expect(noContacts(t)).toContain("[phone]");
  });
});
