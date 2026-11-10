import { describe, expect, it } from "vitest";
import { roleForPath } from "@/lib/demo";

describe("roleForPath", () => {
  it("is the customer on the public site", () => {
    expect(roleForPath("/")).toBe("customer");
    expect(roleForPath("/used-cars/some-car")).toBe("customer");
  });
  it("is the dealer under /admin and the superuser under /platform", () => {
    expect(roleForPath("/admin")).toBe("dealer");
    expect(roleForPath("/admin/stock")).toBe("dealer");
    expect(roleForPath("/platform/billing")).toBe("superuser");
  });
  it("does not match a path that only starts with the same letters", () => {
    expect(roleForPath("/administrator")).toBe("customer");
  });
});

import { isAppPath } from "@/lib/demo";
describe("isAppPath", () => {
  it("is true under /admin and /platform only", () => {
    expect(isAppPath("/admin/leads")).toBe(true);
    expect(isAppPath("/platform")).toBe(true);
    expect(isAppPath("/used-cars")).toBe(false);
  });
});
