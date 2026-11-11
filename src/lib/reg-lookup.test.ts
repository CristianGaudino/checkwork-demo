import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { lookupReg } = await import("./reg-lookup");

describe("lookupReg", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("on the demo gives the plate's facts and a sample car, the same car for the same plate", async () => {
    const a = await lookupReg("191-KY-1234");
    expect(a).toMatchObject({ year: 2019, half: 1, county: "Kerry" });
    expect(a?.car?.make).toBeTruthy();
    expect((await lookupReg("191 ky 1234"))?.car).toEqual(a?.car);
  });

  it("with simulation off and no service, only what the plate itself says: never an invented car", async () => {
    vi.stubEnv("SIMULATE_INTEGRATIONS", "off");
    const a = await lookupReg("191-KY-1234");
    expect(a).toEqual({ reg: "191-KY-1234", year: 2019, half: 1, county: "Kerry" });
  });

  it("not an Irish plate: nothing", async () => {
    expect(await lookupReg("AB12 CDE")).toBeNull();
  });
});
