import { getBindings } from "@/lib/leads/bindings";
import { isCountEvent } from "@/lib/owner-api/counter-rules";
import { bump } from "@/lib/owner-api/counters";

const headers = { "Cache-Control": "no-store" };

// An anonymous count of one feature use (src/lib/count-client.ts). The body is {"event": "<name from the fixed list>"}; nothing else is read,
// stored or logged. The limit is per visitor, the way the lead forms' is; a visitor over it is simply not counted.
async function readUpTo(req: Request, max: number): Promise<string | null> {
  if (Number(req.headers.get("content-length") ?? 0) > max) return null;
  const reader = req.body?.getReader();
  if (!reader) return "";
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    parts.push(value);
  }
  const all = new Uint8Array(size);
  parts.reduce((at, p) => (all.set(p, at), at + p.length), 0);
  return new TextDecoder().decode(all);
}

export async function POST(req: Request) {
  // A count is a few bytes: the body is read only up to 200 bytes, so a big one is refused without being held, with or without a stated size.
  const body = await readUpTo(req, 200);
  if (body === null) return new Response(null, { status: 413, headers });
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
