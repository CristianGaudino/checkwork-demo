import { describe, expect, it } from "vitest";
import { accessConfig, verifyAccessJwt } from "@/lib/access";

const cfg = { team: "team.cloudflareaccess.com", aud: "aud-1" };
const b64 = (o: unknown) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");

async function setup() {
  const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...(await crypto.subtle.exportKey("jwk", pair.publicKey)), kid: "k1" };
  const sign = async (claims: object, header: object = { alg: "RS256", kid: "k1" }, key = pair.privateKey) => {
    const body = `${b64(header)}.${b64(claims)}`;
    return `${body}.${Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(body))).toString("base64url")}`;
  };
  return { jwk, sign, keys: async () => [jwk] };
}
const good = { aud: ["aud-1"], iss: "https://team.cloudflareaccess.com", exp: 2000, email: "dealer@example.com" };

describe("verifyAccessJwt", () => {
  it("accepts a valid token and returns the email", async () => {
    const { sign, keys } = await setup();
    expect(await verifyAccessJwt(await sign(good), cfg, keys, 1000)).toEqual({ email: "dealer@example.com" });
  });
  it("refuses a missing, malformed, expired, wrong-audience or wrong-issuer token", async () => {
    const { sign, keys } = await setup();
    for (const t of [undefined, "", "a.b", "a.b.c.d", await sign({ ...good, exp: 900 }), await sign({ ...good, aud: ["other"] }), await sign({ ...good, iss: "https://evil.example" }), await sign({ ...good, nbf: 1500 })]) {
      expect(await verifyAccessJwt(t, cfg, keys, 1000)).toBeNull();
    }
  });
  it("refuses a token signed with a different key, an unknown kid, or another algorithm", async () => {
    const a = await setup();
    const b = await setup();
    expect(await verifyAccessJwt(await b.sign(good), cfg, a.keys, 1000)).toBeNull();
    expect(await verifyAccessJwt(await a.sign(good, { alg: "RS256", kid: "nope" }), cfg, a.keys, 1000)).toBeNull();
    expect(await verifyAccessJwt(await a.sign(good, { alg: "none", kid: "k1" }), cfg, a.keys, 1000)).toBeNull();
  });
  it("asks for fresh keys when a token names one it does not have, so a key rotation does not lock staff out", async () => {
    const { jwk, sign } = await setup();
    const asked: boolean[] = [];
    const rotated = async (_team: string, fresh?: boolean) => (asked.push(Boolean(fresh)), fresh ? [jwk] : []);
    expect(await verifyAccessJwt(await sign(good), cfg, rotated, 1000)).toEqual({ email: "dealer@example.com" });
    expect(asked).toEqual([false, true]);
  });
  it("refuses when the keys cannot be loaded", async () => {
    const { sign } = await setup();
    expect(await verifyAccessJwt(await sign(good), cfg, async () => { throw new Error("down"); }, 1000)).toBeNull();
  });
});

describe("accessConfig", () => {
  it("needs both values and tidies the team domain", () => {
    expect(accessConfig({})).toBeNull();
    expect(accessConfig({ CF_ACCESS_TEAM_DOMAIN: "t.cloudflareaccess.com" })).toBeNull();
    expect(accessConfig({ CF_ACCESS_TEAM_DOMAIN: "https://t.cloudflareaccess.com/", CF_ACCESS_AUD: "x" })).toEqual({ team: "t.cloudflareaccess.com", aud: "x" });
  });
});
