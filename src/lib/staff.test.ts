import { afterEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/staff"); // the setup stubs it for the action tests; this file tests the real one
vi.mock("server-only", () => ({}));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
let sent: Record<string, string> = {};
vi.mock("next/headers", () => ({ headers: async () => ({ get: (n: string) => sent[n] ?? null }) }));
const verify = vi.fn();
vi.mock("@/lib/access", async (orig) => ({ ...(await orig<typeof import("@/lib/access")>()), verifyAccessJwt: (...a: unknown[]) => verify(...a) }));
const { requireStaff, staffIdentity } = await import("./staff");

afterEach(() => {
  vi.unstubAllEnvs();
  sent = {};
  verify.mockReset();
});
const access = () => {
  vi.stubEnv("CF_ACCESS_TEAM_DOMAIN", "team.cloudflareaccess.com");
  vi.stubEnv("CF_ACCESS_AUD", "aud");
};

describe("who the dashboard is talking to", () => {
  it("is staff with the email Access signed for, never one a header says", async () => {
    access();
    verify.mockResolvedValueOnce({ email: "Owner@Dealer.ie" });
    sent = { "cf-access-jwt-assertion": "a.b.c", "x-admin-email": "forged@evil.example" };
    expect(await staffIdentity()).toEqual({ ok: true, email: "owner@dealer.ie" });
  });

  it("is nobody with no token, a forged token, or no Access set up, and an action then answers as if it were not there", async () => {
    sent = { "x-admin-email": "owner@dealer.ie" };
    expect(await staffIdentity()).toEqual({ ok: false });
    access();
    expect(await staffIdentity()).toEqual({ ok: false });
    verify.mockResolvedValueOnce(null);
    sent = { "cf-access-jwt-assertion": "forged" };
    expect(await staffIdentity()).toEqual({ ok: false });
    await expect(requireStaff()).rejects.toThrow();
  });

  it("is open where the dashboard is open (development, the E2E build)", async () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_OPEN", "1");
    expect(await staffIdentity()).toEqual({ ok: true, email: "" });
  });
});
