import { afterEach, describe, expect, it } from "vitest";
import { ownerAuth } from "./auth";
import { DASH_EVENTS, countId, isCountEvent } from "./counter-rules";

const req = (auth?: string) => new Request("https://x.test/api/owner/v1/summary", { headers: auth ? { authorization: auth } : {} });
afterEach(() => {
  delete process.env.OWNER_API_TOKEN;
  delete process.env.OWNER_API_MONEY;
});

describe("ownerAuth", () => {
  it("refuses with no secret set, no token or a wrong one", () => {
    expect(ownerAuth(req("Bearer anything")).ok).toBe(false);
    process.env.OWNER_API_TOKEN = "s3cret";
    expect(ownerAuth(req()).ok).toBe(false);
    expect(ownerAuth(req("Bearer s3cre")).ok).toBe(false);
    expect(ownerAuth(req("Bearer s3cret2")).ok).toBe(false);
    expect(ownerAuth(req("s3cret")).ok).toBe(false);
  });
  it("accepts the token, and money only with the second secret", () => {
    process.env.OWNER_API_TOKEN = "s3cret";
    expect(ownerAuth(req("Bearer s3cret"))).toEqual({ ok: true, money: false });
    process.env.OWNER_API_MONEY = "1";
    expect(ownerAuth(req("Bearer s3cret"))).toEqual({ ok: true, money: true });
  });
});

describe("the counter allow-list", () => {
  it("takes the named events and dashboard areas, and nothing else", () => {
    for (const e of ["saved", "compare", "finance", "units", "no-results", "contact-topic", "filter:fuel", "filter:km", "dash:leads", "dash:overview"]) expect(isCountEvent(e)).toBe(true);
    for (const e of ["filter:colour", "dash:secret", "dash:", "saved ", "SAVED", "", "a@b.ie", 7, null, undefined, { event: "saved" }]) expect(isCountEvent(e)).toBe(false);
    expect(DASH_EVENTS).toContain("dash:monthly-report");
  });
  it("keeps one record a day for an event", () => {
    expect(countId("2026-11-16", "filter:fuel")).toBe("2026-11-16:filter:fuel");
  });
});
