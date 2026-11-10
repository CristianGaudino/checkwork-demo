import { afterEach, describe, expect, it, vi } from "vitest";
import type { Ad, Newsletter, SocialPost } from "./collections";

vi.mock("server-only", () => ({}));
const { publishPost, sendNewsletter, startAd } = await import("./publishers");

afterEach(() => vi.unstubAllEnvs());

// Until a provider is installed, nothing is ever reported as sent: not-connected without keys, not-installed with them.
describe("publishers never pretend", () => {
  const post = {} as SocialPost;
  const ad = {} as Ad;
  const nl = {} as Newsletter;
  it("say not-connected without the settings", async () => {
    expect(await publishPost(post)).toEqual({ ok: false, reason: "not-connected" });
    expect(await startAd(ad)).toEqual({ ok: false, reason: "not-connected" });
    expect(await sendNewsletter(nl)).toEqual({ ok: false, reason: "not-connected" });
  });
  it("say not-installed with the settings, and still not ok", async () => {
    for (const k of ["META_PAGE_ID", "META_PAGE_ACCESS_TOKEN", "META_INSTAGRAM_ID"]) vi.stubEnv(k, "x");
    expect(await publishPost(post)).toEqual({ ok: false, reason: "not-installed" });
  });
});
