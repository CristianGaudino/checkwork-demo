import { describe, expect, it } from "vitest";
import { bandOf, channelOf, missedMake, sourceText } from "./visit-rules";

const page = "https://checkworkmotors.ie/used-cars";

describe("channelOf", () => {
  it("reads the page a visit came from", () => {
    expect(channelOf(page, "https://www.google.ie/")).toBe("google");
    expect(channelOf(page, "https://l.facebook.com/")).toBe("facebook");
    expect(channelOf(page, "https://l.instagram.com/")).toBe("instagram");
    expect(channelOf(page, "https://www.donedeal.ie/cars")).toBe("donedeal");
    expect(channelOf(page, "https://www.bing.com/")).toBe("bing");
    expect(channelOf(page, "https://mail.google.com/")).toBe("email"); // Gmail, not a Google search
    expect(channelOf(page, "https://someblog.ie/post")).toBe("other");
  });

  it("a tagged link wins over the page it came from, and a click id says the ad network", () => {
    expect(channelOf(`${page}?utm_source=facebook&utm_medium=paid`, "https://www.google.ie/")).toBe("facebook");
    expect(channelOf(`${page}?utm_source=ig`, "")).toBe("instagram");
    expect(channelOf(`${page}?utm_source=dealer&utm_medium=email`, "")).toBe("email");
    expect(channelOf(`${page}?utm_source=newsletter`, "")).toBe("email");
    expect(channelOf(`${page}?utm_source=flyer`, "")).toBe("other");
    expect(channelOf(`${page}?gclid=abc`, "")).toBe("google");
    expect(channelOf(`${page}?fbclid=abc`, "")).toBe("facebook");
  });

  it("no referrer or a bad value is typed in; our own site is a visit already under way", () => {
    expect(channelOf(page, "")).toBe("direct");
    expect(channelOf(page, "https://checkworkmotors.ie/")).toBeNull(); // a car opened in a new tab is not a new visit
    expect(channelOf(page, "not a url")).toBe("direct");
    expect(channelOf("nonsense", "https://www.google.ie/")).toBe("direct");
  });
});

describe("bandOf", () => {
  it("takes the top of the price filter, or the bottom when only that is set", () => {
    expect(bandOf({})).toBeNull();
    expect(bandOf({ priceMax: 10000 })).toBe("under-10k");
    expect(bandOf({ priceMax: 15000 })).toBe("10k-20k");
    expect(bandOf({ priceMin: 5000, priceMax: 30000 })).toBe("20k-30k");
    expect(bandOf({ priceMax: 80000 })).toBe("over-50k");
    expect(bandOf({ priceMin: 30000 })).toBe("30k-50k");
    expect(bandOf({ priceMin: 50000 })).toBe("over-50k");
  });
});

describe("missedMake", () => {
  it("names a make from the filter or the search box, and anything else is other, so typed words are never kept", () => {
    expect(missedMake({ make: ["land-rover"] })).toBe("land-rover");
    expect(missedMake({ q: "Tesla model 3", make: [] })).toBe("tesla");
    expect(missedMake({ q: "citroën c4", make: [] })).toBe("citroen");
    expect(missedMake({ q: "087 123 4567", make: [] })).toBe("other");
    expect(missedMake({ q: "minibus", make: [] })).toBe("other"); // a word that starts like a make is not it
  });
});

it("sourceText says where a website lead came from", () => {
  expect(sourceText({ source: "Website", channel: "Facebook" })).toBe("Website, from Facebook");
  expect(sourceText({ source: "Phone" })).toBe("Phone");
});
