import { getBindings } from "@/lib/leads/bindings";
import { isCountEvent } from "@/lib/owner-api/counter-rules";
import { bump } from "@/lib/owner-api/counters";

const headers = { "Cache-Control": "no-store" };

// An anonymous count of one feature use (src/lib/count-client.ts). The body is {"event": "<name from the fixed list>"}; nothing else is read,
// stored or logged. The limit is per visitor, the way the lead forms' is; a visitor over it is simply not counted.
export async function POST(req: Request) {
  // A count is a few bytes (a beacon always says how many): anything bigger, or of no stated size, is refused before it is read.
  if (Number(req.headers.get("content-length") ?? 201) > 200) return new Response(null, { status: 413, headers });
  const body = (await req.text()).slice(0, 200);
  let event: unknown;
  try {
    event = (JSON.parse(body) as { event?: unknown }).event;
  } catch {
    return new Response(null, { status: 400, headers });
  }
  if (!isCountEvent(event)) return new Response(null, { status: 400, headers });
  // Every count is limited per visitor, with its own limiter (20 a minute: a buyer setting filters, saving and comparing stays under it).
  // With no limiter (next dev, the E2E run) nothing is limited.
  const limiter = getBindings().COUNT_LIMITER;
  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  if (limiter && !(await limiter.limit({ key: `count:${ip}` })).success) return new Response(null, { status: 204, headers });
  try {
    await bump(event);
  } catch {
    // a lost count is fine; the visitor never sees it
  }
  return new Response(null, { status: 204, headers });
}
