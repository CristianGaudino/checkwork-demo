import { runSync, syncRunsHere } from "@/lib/donedeal/sync";

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

// The Worker's 15-minute cron (worker.mjs) runs the DoneDeal sync through here, with SYNC_KEY (a secret) as a bearer token. Without the
// key set, or on a site whose stock is not from DoneDeal, it is not there. The answer is counts only, never a car or a person.
export async function POST(req: Request) {
  const key = process.env.SYNC_KEY;
  if (!key || !syncRunsHere() || !same(req.headers.get("authorization") ?? "", `Bearer ${key}`)) return new Response(null, { status: 404, headers });
  const s = await runSync();
  return Response.json({ ok: !s.problem, result: s.result ?? null, held: Boolean(s.held) }, { headers });
}

// The same length of work however much of the key matches, so the answer time gives nothing away.
function same(a: string, b: string) {
  const [x, y] = [new TextEncoder().encode(a), new TextEncoder().encode(b)];
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
