import "server-only";
import { addDays, dublinDay, isIsoDay } from "@/lib/admin/format";
import { ownerAuth } from "./auth";

const HOUR_S = 3600;
const cache = new Map<string, { at: number; body: unknown }>();
const MAX_DAYS = 366;

// One wrapper for every owner route: the token check (404 without it, like the closed dashboard), the range, and an hour's cache per
// range, so the owner's program calling 50 sites never slows a dealer's.
// shortcut: the cache is per Worker instance, so each instance answers once an hour; fine for a read every few hours.
export async function ownerGet(req: Request, name: string, build: (r: { from: string; to: string; money: boolean }) => Promise<unknown>): Promise<Response> {
  const auth = ownerAuth(req);
  if (!auth.ok) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  const q = new URL(req.url).searchParams;
  const today = dublinDay();
  const to = q.get("to") ?? today;
  const from = q.get("from") ?? addDays(to, -29);
  const span = isIsoDay(from) && isIsoDay(to) ? (Date.parse(to) - Date.parse(from)) / 86_400_000 : -1;
  if (span < 0 || span >= MAX_DAYS) return Response.json({ error: "from and to must be days as YYYY-MM-DD, from not after to, within a year" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const key = `${name}|${from}|${to}|${auth.money}`;
  const hit = cache.get(key);
  let body = hit && Date.now() - hit.at < HOUR_S * 1000 ? hit.body : undefined;
  if (!body) {
    body = await build({ from, to, money: auth.money });
    cache.set(key, { at: Date.now(), body });
    if (cache.size > 200) cache.delete(cache.keys().next().value!);
  }
  return Response.json(body, { headers: { "Cache-Control": `private, max-age=${HOUR_S}`, "X-Robots-Tag": "noindex" } });
}
