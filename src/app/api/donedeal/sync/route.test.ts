import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const run = vi.fn(async () => ({ id: "status", result: { added: 0, changed: 0, sold: 0 } }));
vi.mock("@/lib/donedeal/sync", () => ({ runSync: () => run(), syncRunsHere: () => true }));
const { POST } = await import("./route");
const call = (auth?: string) => POST(new Request("https://example.com/api/donedeal/sync", { method: "POST", headers: auth ? { authorization: auth } : {} }));

afterEach(() => {
  vi.unstubAllEnvs();
  run.mockClear();
});

describe("POST /api/donedeal/sync", () => {
  it("is not there without the key set, or without the right key", async () => {
    expect((await call("Bearer anything")).status).toBe(404);
    vi.stubEnv("SYNC_KEY", "s3cret");
    expect((await call()).status).toBe(404);
    expect((await call("Bearer s3cre")).status).toBe(404);
    expect((await call("Bearer s3cret!")).status).toBe(404);
    expect(run).not.toHaveBeenCalled();
  });

  it("runs the sync with the key and answers with counts only", async () => {
    vi.stubEnv("SYNC_KEY", "s3cret");
    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, result: { added: 0, changed: 0, sold: 0 }, held: false });
    expect(run).toHaveBeenCalledOnce();
  });
});
