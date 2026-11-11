import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { roleForPath } from "@/lib/demo";

describe("roleForPath", () => {
  it("is the customer on the public site", () => {
    expect(roleForPath("/")).toBe("customer");
    expect(roleForPath("/used-cars/some-car")).toBe("customer");
  });
  it("is the dealer under /dashboard, and /platform is not a role (the platform is not part of a dealer site)", () => {
    expect(roleForPath("/dashboard")).toBe("dealer");
    expect(roleForPath("/dashboard/stock")).toBe("dealer");
    expect(roleForPath("/platform/billing")).toBe("customer");
  });
  it("does not match a path that only starts with the same letters", () => {
    expect(roleForPath("/administrator")).toBe("customer");
  });
});

import { adminReachable, isAppPath } from "@/lib/demo";
describe("isAppPath", () => {
  it("is true under /dashboard only", () => {
    expect(isAppPath("/dashboard/leads")).toBe(true);
    expect(isAppPath("/platform")).toBe(false);
    expect(isAppPath("/used-cars")).toBe(false);
  });
});

describe("adminReachable", () => {
  // The CI job may set the open switch for the whole run, and passing undefined would fall back to it, so it is cleared first.
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_ADMIN_OPEN", ""));
  afterEach(() => vi.unstubAllEnvs());
  it("is open in next dev, and closed in any build unless the open switch is 1", () => {
    expect(adminReachable("development", undefined)).toBe(true);
    expect(adminReachable("production", undefined)).toBe(false); // a build, whatever APP_ENV says, or with none
    expect(adminReachable(undefined, undefined)).toBe(false); // the tests themselves (NODE_ENV=test)
    expect(adminReachable("production", "true")).toBe(false);
    expect(adminReachable("production", "1")).toBe(true);
  });
});
