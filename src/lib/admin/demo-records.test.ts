import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// A clone for a real dealer must not open its dashboard on made-up leads, reviews and people.
async function fresh() {
  vi.resetModules();
  return import("./collections");
}

describe("demo records", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("a production site starts empty, with the settings it needs and no made-up team", async () => {
    vi.stubEnv("APP_ENV", "production");
    const c = await fresh();
    expect(await c.leadsStore.list()).toEqual([]);
    expect(await c.reviewsStore.list()).toEqual([]);
    expect(await c.postsStore.list()).toEqual([]);
    expect((await c.getSettings()).team).toEqual([]);
    expect((await c.getSettings()).leadSlaHours).toBe(24);
  });

  it("the demo is seeded, and DEMO_RECORDS=on seeds a production showcase too", async () => {
    expect((await (await fresh()).leadsStore.list()).length).toBeGreaterThan(10);
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("DEMO_RECORDS", "on");
    expect((await (await fresh()).leadsStore.list()).length).toBeGreaterThan(10);
  });
});

describe("reset demo data", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("does nothing on a site without demo records, so a real dealer's leads are never wiped", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    const { leadsStore } = await import("./collections");
    const { resetDemoAction } = await import("@/app/dashboard/settings/actions");
    await leadsStore.put({ id: "lead-own-1", type: "enquiry", status: "new", name: "A", email: "", phone: "", message: "", source: "Website", notes: [], createdAt: 1 });
    await resetDemoAction();
    expect((await leadsStore.list()).map((l) => l.id)).toEqual(["lead-own-1"]);
  });
});
