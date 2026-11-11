import { cronAuthorized } from "@/lib/cron";
import { runSync, syncRunsHere } from "@/lib/donedeal/sync";

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

// The Worker's 15-minute cron (worker.mjs) runs the DoneDeal sync through here, with CRON_KEY. Without the key set, or on a site whose
// stock is not from DoneDeal, it is not there. The answer is counts only, never a car or a person.
export async function POST(req: Request) {
  if (!cronAuthorized(req) || !syncRunsHere()) return new Response(null, { status: 404, headers });
  const s = await runSync();
  return Response.json({ ok: !s.problem, result: s.result ?? null, held: Boolean(s.held) }, { headers });
}
