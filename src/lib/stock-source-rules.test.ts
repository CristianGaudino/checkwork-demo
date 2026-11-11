import { describe, expect, it } from "vitest";
import { DONEDEAL_DEALER_URL, listingHref } from "./stock-source-rules";

describe("listingHref", () => {
  it("uses a car's own https ad on DoneDeal", () => {
    expect(listingHref({ listingUrl: "https://www.donedeal.ie/cars-for-sale/ford-focus/123" })).toBe("https://www.donedeal.ie/cars-for-sale/ford-focus/123");
  });
  it("falls back to the dealer's page for no address, another site or a script", () => {
    for (const listingUrl of [undefined, "", "javascript:alert(1)", "http://www.donedeal.ie/x", "https://donedeal.ie.evil.example/x", "https://evil.example/donedeal.ie"]) {
      expect(listingHref({ listingUrl })).toBe(DONEDEAL_DEALER_URL);
    }
  });
});
