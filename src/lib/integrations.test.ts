import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { regLookupMode, simulating } = await import("./integrations");

afterEach(() => vi.unstubAllEnvs());

describe("the registration lookup's mode", () => {
  it("is simulated with no key, live with one, and off when simulation is off", () => {
    expect(regLookupMode()).toBe("simulated");
    vi.stubEnv("CARTELL_API_KEY", "key");
    expect(regLookupMode()).toBe("live");
    vi.stubEnv("CARTELL_API_KEY", "");
    vi.stubEnv("SIMULATE_INTEGRATIONS", "off");
    expect(regLookupMode()).toBe("off");
  });
});

describe("simulation", () => {
  it("does not simulate on a production site unless asked", () => {
    vi.stubEnv("APP_ENV", "production");
    expect(simulating()).toBe(false);
    vi.stubEnv("SIMULATE_INTEGRATIONS", "on");
    expect(simulating()).toBe(true);
    vi.stubEnv("APP_ENV", "demo");
    vi.stubEnv("SIMULATE_INTEGRATIONS", "");
    expect(simulating()).toBe(true);
  });
});
