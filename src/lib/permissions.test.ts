import { afterEach, describe, expect, it, vi } from "vitest";

// What the request carries, set per test.
let cookie: string | undefined;
let email: string | undefined;
vi.mock("server-only", () => ({}));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn })); // a fresh answer per call
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "checkwork-demo-role" && cookie !== undefined ? { value: cookie } : undefined) }),
  headers: async () => ({ get: (n: string) => (n === "x-admin-email" ? (email ?? null) : null) }),
}));
// The verified Access email (src/lib/staff.ts verifies the token; here the test says who it is).
vi.mock("@/lib/staff", () => ({ staffIdentity: async () => (email === undefined ? { ok: false } : { ok: true, email: email.toLowerCase() }) }));
const { can, currentMember } = await import("./permissions");
const { settingsStore } = await import("@/lib/admin/collections");

afterEach(async () => {
  vi.unstubAllEnvs();
  cookie = undefined;
  email = undefined;
  await settingsStore.reset();
});

const production = () => {
  vi.stubEnv("APP_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_ADMIN_OPEN", "");
  vi.stubEnv("DEMO_RECORDS", "on"); // the demo team (Aoife Owner, Conor Sales, Niamh Finance), to match emails against
};

describe("on the demo", () => {
  it("acts as the owner by default, and as the first team member with the role the bar picked", async () => {
    vi.stubEnv("APP_ENV", "demo");
    expect(await currentMember()).toMatchObject({ name: "Aoife Brennan", role: "Owner" });
    expect(await can("margins")).toBe(true);
    cookie = "Sales";
    expect(await currentMember()).toMatchObject({ name: "Conor Doyle", role: "Sales" });
    expect(await can("margins")).toBe(false);
    cookie = "Finance";
    expect([await can("margins"), await can("team")]).toEqual([true, false]);
    cookie = "nonsense";
    expect((await currentMember()).role).toBe("Owner");
  });

  it("keeps the owner with the demo bar off (the live demo), where Access lets people in with no ADMIN_OWNER_EMAILS", async () => {
    vi.stubEnv("APP_ENV", "demo");
    vi.stubEnv("NEXT_PUBLIC_DEMO_BAR", "off");
    vi.stubEnv("NEXT_PUBLIC_ADMIN_OPEN", "");
    vi.resetModules(); // the bar's setting is read when src/lib/demo.ts loads
    const fresh = await import("./permissions");
    expect((await import("@/lib/demo")).DEMO_BAR_ENABLED).toBe(false);
    email = "visitor@example.com";
    cookie = "Sales"; // left from when the live demo had a bar: nothing can change it now, so it counts for nothing
    expect(await fresh.currentMember()).toMatchObject({ name: "Aoife Brennan", role: "Owner" });
    expect(await fresh.can("margins")).toBe(true);
  });
});

describe("on a production site", () => {
  it("ignores the cookie, even with the demo bar left on", async () => {
    production();
    cookie = "Owner";
    expect(await currentMember()).toMatchObject({ role: null });
    expect(await can("margins")).toBe(false);
    // A build that forgot APP_ENV is treated the same: a cookie never makes anyone the owner.
    vi.stubEnv("APP_ENV", "");
    expect(await can("margins")).toBe(false);
  });

  it("matches the signed-in email to the team, whatever its case", async () => {
    production();
    email = "CONOR@example.com";
    expect(await currentMember()).toMatchObject({ name: "Conor Doyle", role: "Sales" });
    expect(await can("margins")).toBe(false);
    email = "niamh@example.com";
    expect([await can("margins"), await can("team")]).toEqual([true, false]);
    email = "aoife@example.com";
    expect(await can("team")).toBe(true);
  });

  it("makes ADMIN_OWNER_EMAILS owners, team or not, and grants nothing to anyone else", async () => {
    production();
    vi.stubEnv("ADMIN_OWNER_EMAILS", "Boss@dealer.ie, other@dealer.ie");
    email = "boss@dealer.ie";
    expect(await can("team")).toBe(true);
    email = "stranger@dealer.ie";
    expect(await currentMember()).toMatchObject({ role: null });
    email = undefined;
    expect(await can("margins")).toBe(false);
  });
});
