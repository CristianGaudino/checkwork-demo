import { describe, expect, it } from "vitest";
import { commercialBody, makeList, makeListMetadata } from "./make-list";

const none = Promise.resolve({});

// /commercial/<slug>: a make first, then a commercial body type at its plural slug, else not found.
describe("the commercial list's address", () => {
  it("a make is a make, with its own heading", async () => {
    expect(await makeList("commercial", "ford", none)).toEqual({ params: { make: "ford" }, title: "Ford commercials" });
    expect(await makeList("commercial", "toyota", none)).toEqual({ params: { make: "toyota" }, title: "Toyota commercials" }); // a known make with none
  });
  it("a body type of the commercial stock is its plural, filtered to it, with its own heading and intro", async () => {
    const vans = await makeList("commercial", "vans", Promise.resolve({ sort: "price-asc" }));
    expect(vans).toMatchObject({ params: { sort: "price-asc", body: "van" }, title: "Used vans" });
    expect(vans!.intro).toMatch(/^We have 5 used vans in stock in /);
    expect(await makeList("commercial", "pickups", none)).toMatchObject({ params: { body: "pickup" }, title: "Used pickups" });
  });
  it("an unknown slug, a used body type, or the singular slug is not found", async () => {
    for (const slug of ["nope", "suv", "van"]) {
      expect(await makeList("commercial", slug, none), slug).toBeNull();
      expect(await commercialBody(slug), slug).toBeNull();
    }
  });
  it("a body type's page is titled for the town, with its own canonical", async () => {
    const m = await makeListMetadata("commercial", "vans");
    expect(m.title).toMatch(/^Used vans for sale in /);
    expect(m.alternates?.canonical).toBe("/commercial/vans");
    expect(m.robots).toBeUndefined();
    expect((await makeListMetadata("commercial", "ford")).title).toMatch(/^Ford commercials for sale in /);
  });
});
