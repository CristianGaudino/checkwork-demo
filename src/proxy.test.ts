import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/stock", () => ({ stock: { lookup: async () => null } }));
const verify = vi.fn();
vi.mock("@/lib/access", async (orig) => ({ ...(await orig<typeof import("@/lib/access")>()), verifyAccessJwt: (...a: unknown[]) => verify(...a) }));
const { proxy } = await import("./proxy");

afterEach(() => vi.unstubAllEnvs());
const get = (path: string, headers: Record<string, string> = {}) => proxy(new NextRequest(`https://demo.example${path}`, { headers }));

describe("the admin gate in the proxy", () => {
  it("answers 404 with noindex for /admin on a deployed site with no Access token", async () => {
    vi.stubEnv("APP_ENV", "demo");
    for (const path of ["/admin", "/admin/stock", "/admin/margins"]) {
      const res = await get(path);
      expect(res.status).toBe(404);
      expect(res.headers.get("x-robots-tag")).toBe("noindex");
    }
  });
  it("still 404s when Access is configured and the token is missing or forged", async () => {
    vi.stubEnv("APP_ENV", "demo");
    vi.stubEnv("CF_ACCESS_TEAM_DOMAIN", "team.cloudflareaccess.com");
    vi.stubEnv("CF_ACCESS_AUD", "aud");
    expect((await get("/admin")).status).toBe(404);
    expect((await get("/admin", { "cf-access-jwt-assertion": "a.b.c" })).status).toBe(404);
  });
  it("is open in development (no APP_ENV), and the public site is never gated", async () => {
    vi.stubEnv("APP_ENV", "");
    expect((await get("/admin")).status).toBe(200);
    vi.stubEnv("APP_ENV", "demo");
    expect((await get("/used-cars")).status).toBe(200);
  });

  it("passes a verified address on to the pages, and throws away one the browser sent", async () => {
    vi.stubEnv("APP_ENV", "demo");
    vi.stubEnv("CF_ACCESS_TEAM_DOMAIN", "team.cloudflareaccess.com");
    vi.stubEnv("CF_ACCESS_AUD", "aud");
    verify.mockResolvedValueOnce({ email: "owner@dealer.ie" });
    const ok = await get("/admin/margins", { "cf-access-jwt-assertion": "a.b.c", "x-admin-email": "forged@evil.example" });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("x-middleware-request-x-admin-email")).toBe("owner@dealer.ie");
    // A forged header with no valid token never gets that far.
    verify.mockResolvedValueOnce(null);
    expect((await get("/admin", { "cf-access-jwt-assertion": "a.b.c", "x-admin-email": "forged@evil.example" })).status).toBe(404);
  });
  it("in development (no Access) drops any x-admin-email the browser sent", async () => {
    vi.stubEnv("APP_ENV", "");
    const res = await get("/admin", { "x-admin-email": "forged@evil.example" });
    expect(res.headers.get("x-middleware-request-x-admin-email")).toBeNull();
    expect(res.headers.get("x-middleware-override-headers") ?? "").not.toContain("x-admin-email");
  });
});
