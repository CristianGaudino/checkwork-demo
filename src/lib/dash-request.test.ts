import { afterEach, describe, expect, it, vi } from "vitest";
import { askDash } from "./dash-request";

const req = () => new Request("https://dash.test/x", { redirect: "manual" });
afterEach(() => vi.useRealTimers());

describe("askDash", () => {
  it("uses the binding when there is one, and fetch when there is not", async () => {
    const binding = { fetch: vi.fn(async () => new Response(null, { status: 204 })) };
    expect((await askDash(binding, req(), 100))?.status).toBe(204);
    expect(binding.fetch).toHaveBeenCalledTimes(1);
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    expect((await askDash(undefined, req(), 100))?.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(1);
    f.mockRestore();
  });

  it("gives undefined on a throw, and on a timeout even if the binding ignores the abort", async () => {
    expect(await askDash({ fetch: async () => Promise.reject(new Error("down")) }, req(), 100)).toBeUndefined();
    vi.useFakeTimers();
    const hung = askDash({ fetch: () => new Promise<Response>(() => {}) }, req(), 1500);
    await vi.advanceTimersByTimeAsync(1500);
    expect(await hung).toBeUndefined();
  });
});
