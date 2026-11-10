// Cloudflare Access puts a signed token (a JWT) on every request it lets through. The admin and platform check it themselves, so they
// stay closed if the Access policy is ever missing or the route is not covered. Set CF_ACCESS_TEAM_DOMAIN (team.cloudflareaccess.com)
// and CF_ACCESS_AUD (the application's audience tag) as Worker variables. Nothing here is secret.
type Jwk = JsonWebKey & { kid: string };
export type AccessConfig = { team: string; aud: string };

export const accessConfig = (env: Record<string, string | undefined> = process.env): AccessConfig | null => {
  const team = env.CF_ACCESS_TEAM_DOMAIN?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const aud = env.CF_ACCESS_AUD?.trim();
  return team && aud ? { team, aud } : null;
};

let cache: { team: string; at: number; keys: Jwk[] } | null = null;
let failedAt = 0; // a failed fetch is remembered briefly, so an outage does not make every admin request call out
const KEY_TTL_MS = 60 * 60 * 1000;

async function fetchKeys(team: string): Promise<Jwk[]> {
  if (cache && cache.team === team && Date.now() - cache.at < KEY_TTL_MS) return cache.keys;
  if (Date.now() - failedAt < 30_000) throw new Error("access keys unavailable");
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`).catch(() => null);
  if (!res?.ok) {
    failedAt = Date.now();
    throw new Error("access keys unavailable");
  }
  const keys = ((await res.json()) as { keys: Jwk[] }).keys;
  cache = { team, at: Date.now(), keys };
  return keys;
}

const part = (s: string) => JSON.parse(Buffer.from(s, "base64url").toString("utf8"));

// Returns the signed-in email, or null for anything wrong: no token, bad shape, wrong key, wrong audience or issuer, expired.
export async function verifyAccessJwt(token: string | null | undefined, cfg: AccessConfig, getKeys: (team: string) => Promise<Jwk[]> = fetchKeys, nowSec = Math.floor(Date.now() / 1000)): Promise<{ email: string } | null> {
  try {
    const [h, p, s, extra] = (token ?? "").split(".");
    if (!h || !p || !s || extra !== undefined) return null;
    const header = part(h);
    if (header.alg !== "RS256") return null;
    const jwk = (await getKeys(cfg.team)).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, Buffer.from(s, "base64url"), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return null;
    const c = part(p);
    const aud: string[] = Array.isArray(c.aud) ? c.aud : [c.aud];
    if (!aud.includes(cfg.aud) || c.iss !== `https://${cfg.team}` || typeof c.exp !== "number" || c.exp <= nowSec || (typeof c.nbf === "number" && c.nbf > nowSec)) return null;
    return { email: typeof c.email === "string" ? c.email : "" };
  } catch {
    return null;
  }
}
