import { getBindings } from "@/lib/leads/bindings";
import { isCountEvent } from "@/lib/owner-api/counter-rules";
import { bump } from "@/lib/owner-api/counters";

const headers = { "Cache-Control": "no-store" };

// An anonymous count of one feature use (src/lib/count-client.ts). The body is {"event": "<name from the fixed list>"}; nothing else is read,
// stored or logged. The limit is per visitor, the way the lead forms' is; a visitor over it is simply not counted.
export async function POST(req: Request) {
  const body = (await req.text()).slice(0, 200);
  let event: unknown;
  try {
    event = (JSON.parse(body) as { event?: unknown }).event;
  } catch {
    return new Response(null, { status: 400, headers });
  }
  if (!isCountEvent(event)) return new Response(null, { status: 400, headers });
  const limiter = getBindings().LEAD_LIMITER;
  const ip = req.headers.get("cf-connecting-ip");
  // The dashboard's page counts are behind Access and one per area a visit, so only the buyer's events are limited.
  if (limiter && ip && !event.startsWith("dash:") && !(await limiter.limit({ key: `count:${ip}` })).success) return new Response(null, { status: 204, headers });
  try {
    await bump(event);
  } catch {
    // a lost count is fine; the visitor never sees it
  }
  return new Response(null, { status: 204, headers });
}
