import { describe, expect, it } from "vitest";
import { brandsIn } from "./BrandIcon";

const ids = (name: string) => brandsIn(name).map((b) => b.id);

describe("brandsIn", () => {
  it("finds the networks named anywhere in the text, both for a Meta ad, and none for anything else", () => {
    expect(ids("Instagram story")).toEqual(["instagram"]);
    expect(ids("Facebook and Instagram ad")).toEqual(["facebook", "instagram"]);
    expect(ids("Ads (Meta and Google)")).toEqual(["facebook", "instagram", "google"]);
    expect(ids("Website, from Google")).toEqual(["google"]);
    expect(ids("WhatsApp")).toEqual(["whatsapp"]);
    expect(ids("Website")).toEqual([]);
    expect(ids("Metadata")).toEqual([]);
  });
});
