import { describe, expect, it } from "vitest";
import { apexRedirect } from "./redirect";

const WWW = "www.demo.checkwork.ie";
describe("apexRedirect", () => {
  it("sends the bare domain to the same path and query on www", () => {
    expect(apexRedirect("https://demo.checkwork.ie/", WWW)).toBe("https://www.demo.checkwork.ie/");
    expect(apexRedirect("http://demo.checkwork.ie/used-cars/audi?sort=price-asc", WWW)).toBe("https://www.demo.checkwork.ie/used-cars/audi?sort=price-asc");
  });
  it("leaves the canonical host and any other host alone", () => {
    expect(apexRedirect("https://www.demo.checkwork.ie/", WWW)).toBeNull();
    expect(apexRedirect("https://evil.example/", WWW)).toBeNull();
    expect(apexRedirect("https://demo.checkwork.ie.evil.example/", WWW)).toBeNull();
  });
});
