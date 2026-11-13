import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
let allowed = true;
vi.mock("@/lib/leads/bindings", () => ({ getBindings: () => ({ LEAD_LIMITER: { limit: async () => ({ success: allowed }) } }) }));
const { lookupReg, regCache, regCounts, REG_LOOKUPS_A_DAY, REG_LOOKUPS_PER_VISITOR_A_DAY } = await import("./reg-lookup");

describe("lookupReg", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("on the demo gives the plate's facts and a sample car, the same car for the same plate", async () => {
    const a = await lookupReg("191-KY-1234", "");
    expect(a).toMatchObject({ year: 2019, half: 1, county: "Kerry" });
    expect(a?.car?.make).toBeTruthy();
    expect((await lookupReg("191 ky 1234", ""))?.car).toEqual(a?.car);
  });

  it("with simulation off and no service, only what the plate itself says: never an invented car", async () => {
    vi.stubEnv("SIMULATE_INTEGRATIONS", "off");
    const a = await lookupReg("191-KY-1234", "");
    expect(a).toEqual({ reg: "191-KY-1234", year: 2019, half: 1, county: "Kerry" });
  });

  it("not an Irish plate: nothing", async () => {
    expect(await lookupReg("AB12 CDE", "")).toBeNull();
  });
});

describe("lookupReg with the paid service", () => {
  const FOCUS = { make: "Ford", model: "Focus" };
  beforeEach(async () => {
    vi.stubEnv("CARTELL_API_KEY", "key");
    allowed = true;
    await regCache.reset();
    await regCounts.reset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("asks the service once per plate, then answers from the cache", async () => {
    const service = vi.fn(async () => FOCUS);
    expect((await lookupReg("191-KY-1234", "1.1.1.1", service))?.car).toEqual(FOCUS);
    expect((await lookupReg("191 ky 1234", "2.2.2.2", service))?.car).toEqual(FOCUS);
    expect(service).toHaveBeenCalledOnce();
  });

  it("stops at the day's cap and past the visitor's limit, with the plate's facts still given", async () => {
    const service = vi.fn(async () => FOCUS);
    const today = `day-${new Date().toISOString().slice(0, 10)}`;
    await regCounts.put({ id: today, n: REG_LOOKUPS_A_DAY });
    expect(await lookupReg("191-KY-1234", "1.1.1.1", service)).toEqual({ reg: "191-KY-1234", year: 2019, half: 1, county: "Kerry" });
    await regCounts.put({ id: today, n: 0 });
    allowed = false;
    expect((await lookupReg("191-KY-1234", "1.1.1.1", service))?.car).toBeUndefined();
    expect(service).not.toHaveBeenCalled();
  });

  it("gives the plate's facts when the service fails, and does not cache the failure", async () => {
    const service = vi.fn(async () => Promise.reject(new Error("down")));
    expect((await lookupReg("191-KY-1234", "", service))?.car).toBeUndefined();
    expect(await regCache.get("191-KY-1234")).toBeUndefined();
  });

  it("allows a visitor a few paid lookups a day, then only the plate's facts; staff have no such limit", async () => {
    let n = 0;
    const service = vi.fn(async () => FOCUS);
    const plates = Array.from({ length: REG_LOOKUPS_PER_VISITOR_A_DAY + 2 }, () => `191-KY-${1000 + n++}`);
    const cars = [];
    for (const p of plates) cars.push((await lookupReg(p, "9.9.9.9", service))?.car);
    expect(cars.filter(Boolean)).toHaveLength(REG_LOOKUPS_PER_VISITOR_A_DAY);
    expect(service).toHaveBeenCalledTimes(REG_LOOKUPS_PER_VISITOR_A_DAY);
    expect((await lookupReg("191-KY-1", "8.8.8.8", service))?.car).toEqual(FOCUS); // another visitor is not held back
    expect((await lookupReg("191-KY-2", null, service))?.car).toEqual(FOCUS); // nor staff
    allowed = false;
    expect((await lookupReg("191-KY-3", null, service))?.car).toEqual(FOCUS); // the per-minute limit is not theirs either
  });

  it("keeps a visitor's count under a hash, never their address", async () => {
    await lookupReg("191-KY-1234", "203.0.113.7", async () => FOCUS);
    expect(JSON.stringify(await regCounts.list())).not.toContain("203.0.113.7");
  });
});
