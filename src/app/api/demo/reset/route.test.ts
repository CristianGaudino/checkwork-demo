import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
const reset = vi.fn(async () => {});
vi.mock("@/lib/admin/demo-reset", () => ({ resetDemoRecords: reset }));
const { POST } = await import("./route");

const call = (key?: string) => POST(new Request("https://x/api/demo/reset", { method: "POST", headers: key ? { authorization: `Bearer ${key}` } : {} }));

afterEach(() => {
  vi.unstubAllEnvs();
  reset.mockClear();
});

describe("the weekly demo reset", () => {
  it("resets the demo's records with the cron key, on the demo deploy only", async () => {
    vi.stubEnv("CRON_KEY", "k");
    vi.stubEnv("APP_ENV", "demo");
    expect((await call()).status).toBe(404);
    expect((await call("wrong")).status).toBe(404);
    expect((await call("k")).status).toBe(200);
    expect(reset).toHaveBeenCalledOnce();
  });
  it("is not there on a dealer's own site, even with the key", async () => {
    vi.stubEnv("CRON_KEY", "k");
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("DEMO_RECORDS", "on");
    expect((await call("k")).status).toBe(404);
    expect(reset).not.toHaveBeenCalled();
  });
});
