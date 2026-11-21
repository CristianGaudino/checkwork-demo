import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

const reply = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body)));
afterEach(() => vi.unstubAllGlobals());

describe("verifyTurnstile", () => {
  it("passes only a successful check for the lead action, sending the secret, token and IP", async () => {
    const fetch = reply({ success: true, action: "lead" });
    vi.stubGlobal("fetch", fetch);
    expect(await verifyTurnstile("tok", "203.0.113.1", "sec")).toBe(true);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({ secret: "sec", response: "tok", remoteip: "203.0.113.1" });
  });

  it.each([
    ["a failed check, with Cloudflare's codes", { success: false, "error-codes": ["invalid-input-response", "timeout-or-duplicate"] }, ["invalid-input-response", "timeout-or-duplicate"]],
    ["a bad secret", { success: false, "error-codes": ["invalid-input-secret"] }, ["invalid-input-secret"]],
    ["a failed check with no codes", { success: false, action: "lead" }, ["rejected"]],
    ["another action", { success: true, action: "login" }, ["action-mismatch"]],
    ["no action", { success: true }, ["action-mismatch"]],
  ])("refuses %s and says why", async (_, body, codes) => {
    vi.stubGlobal("fetch", reply(body));
    expect(await verifyTurnstile("tok", "203.0.113.1", "sec")).toEqual(codes);
  });

  it("keeps only Cloudflare's documented codes: anything else in the answer is never passed on", async () => {
    vi.stubGlobal("fetch", reply({ success: false, "error-codes": ["invalid-input-response", "buyer@example.com", "tok", 42, "x-other", "x-more"], hostname: "203.0.113.1" }));
    expect(await verifyTurnstile("tok", "203.0.113.1", "sec")).toEqual(["invalid-input-response", "other"]);
  });

  it("gives up after a time limit, so a slow answer cannot hang the form", async () => {
    const fetch = reply({ success: true, action: "lead" });
    vi.stubGlobal("fetch", fetch);
    await verifyTurnstile("tok", "", "sec");
    expect((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].signal).toBeInstanceOf(AbortSignal);
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new DOMException("slow", "TimeoutError"))));
    expect(await verifyTurnstile("tok", "", "sec")).toEqual(["siteverify-timeout"]);
  });

  it("fails closed when the request throws or the answer is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect(await verifyTurnstile("tok", "", "sec")).toEqual(["siteverify-failed"]);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>")));
    expect(await verifyTurnstile("tok", "", "sec")).toEqual(["siteverify-failed"]);
  });

  it("refuses an empty or over-long token without a request, and tells an empty one apart", async () => {
    const fetch = reply({ success: true, action: "lead" });
    vi.stubGlobal("fetch", fetch);
    expect(await verifyTurnstile("", "", "sec")).toEqual(["no-token"]);
    expect(await verifyTurnstile("x".repeat(2049), "", "sec")).toEqual(["token-too-long"]);
    expect(fetch).not.toHaveBeenCalled();
  });
});
