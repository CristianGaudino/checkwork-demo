import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { INTEGRATIONS, isConnected, missingEnv } = await import("./integrations");

afterEach(() => vi.unstubAllEnvs());

describe("integrations", () => {
  it("is not connected until every setting is present, and says which are missing", () => {
    const social = INTEGRATIONS.find((i) => i.id === "social")!;
    expect(isConnected("social")).toBe(false);
    expect(missingEnv(social)).toEqual(social.env);
    vi.stubEnv("META_PAGE_ID", "1");
    vi.stubEnv("META_PAGE_ACCESS_TOKEN", "x");
    expect(isConnected("social")).toBe(false);
    expect(missingEnv(social)).toEqual(["META_INSTAGRAM_ID"]);
    vi.stubEnv("META_INSTAGRAM_ID", "2");
    expect(isConnected("social")).toBe(true);
  });
  it("treats an empty value as missing", () => {
    vi.stubEnv("LEAD_TO_EMAIL", "");
    expect(isConnected("email")).toBe(false);
  });
  it("lists each service once, with at least one setting", () => {
    expect(new Set(INTEGRATIONS.map((i) => i.id)).size).toBe(INTEGRATIONS.length);
    expect(INTEGRATIONS.every((i) => i.env.length > 0)).toBe(true);
  });
});

describe("simulation", () => {
  it("covers only the three outward services, and only until SIMULATE_INTEGRATIONS=off", async () => {
    const { modeOf } = await import("./integrations");
    expect(modeOf("social")).toBe("simulated");
    expect(modeOf("email")).toBe("off"); // lead email shows its true state
    vi.stubEnv("SIMULATE_INTEGRATIONS", "off");
    expect(modeOf("social")).toBe("off");
  });
});
