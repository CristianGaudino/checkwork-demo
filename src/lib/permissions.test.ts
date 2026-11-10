import { afterEach, describe, expect, it, vi } from "vitest";

// What the request carries, set per test.
let cookie: string | undefined;
let email: string | undefined;
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "checkwork-demo-perms" && cookie !== undefined ? { value: cookie } : undefined) }),
  headers: async () => ({ get: (n: string) => (n === "x-admin-email" ? (email ?? null) : null) }),
}));
const { can } = await import("./permissions");

afterEach(() => {
  vi.unstubAllEnvs();
  cookie = undefined;
  email = undefined;
});

describe("can('margins')", () => {
  it("on the demo, follows the demo bar's cookie", async () => {
    vi.stubEnv("APP_ENV", "demo");
    expect(await can("margins")).toBe(false);
    cookie = "margins";
    expect(await can("margins")).toBe(true);
    cookie = "something-else";
    expect(await can("margins")).toBe(false);
  });

  it("on a production site ignores the cookie, even with the demo bar left on", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_ADMIN_OPEN", "");
    cookie = "margins";
    expect(await can("margins")).toBe(false);
  });

  it("on a production site grants it only to a listed, signed-in address", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_ADMIN_OPEN", "");
    vi.stubEnv("ADMIN_MARGINS_EMAILS", "Owner@dealer.ie, accounts@dealer.ie");
    email = "owner@dealer.ie";
    expect(await can("margins")).toBe(true);
    email = "staff@dealer.ie";
    expect(await can("margins")).toBe(false);
    email = undefined;
    expect(await can("margins")).toBe(false);
  });

  it("grants nothing on a production site with no list", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_ADMIN_OPEN", "");
    email = "owner@dealer.ie";
    expect(await can("margins")).toBe(false);
  });
});
