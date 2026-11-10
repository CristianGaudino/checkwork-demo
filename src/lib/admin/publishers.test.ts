import { afterEach, describe, expect, it, vi } from "vitest";
import type { Ad, Newsletter, SocialPost } from "./collections";

vi.mock("server-only", () => ({}));
const { publishPost, sendNewsletter, startAd } = await import("./publishers");

afterEach(() => vi.unstubAllEnvs());

const post = {} as SocialPost;
const ad = {} as Ad;
const nl = {} as Newsletter;

describe("publishers", () => {
  it("simulate on the demo: success flagged as simulated, and nothing goes outside", async () => {
    expect(await publishPost(post)).toEqual({ ok: true, simulated: true });
    expect(await startAd(ad)).toEqual({ ok: true, simulated: true });
    expect(await sendNewsletter(nl)).toEqual({ ok: true, simulated: true });
  });
  it("say not-connected without keys once simulation is off, so a real site never pretends", async () => {
    vi.stubEnv("SIMULATE_INTEGRATIONS", "off");
    expect(await publishPost(post)).toEqual({ ok: false, reason: "not-connected" });
    expect(await startAd(ad)).toEqual({ ok: false, reason: "not-connected" });
    expect(await sendNewsletter(nl)).toEqual({ ok: false, reason: "not-connected" });
  });
  it("say not-installed with keys until the real adapter is written, and never ok", async () => {
    vi.stubEnv("SIMULATE_INTEGRATIONS", "off");
    for (const k of ["META_PAGE_ID", "META_PAGE_ACCESS_TOKEN", "META_INSTAGRAM_ID"]) vi.stubEnv(k, "x");
    expect(await publishPost(post)).toEqual({ ok: false, reason: "not-installed" });
  });
});
