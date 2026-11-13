import type { NextRequest } from "next/server";
import { readToken, unsubscribe } from "../apply";

// The mail app's own unsubscribe button (List-Unsubscribe-Post, RFC 8058): a POST with no page and no cookies. A mail app that only
// opens the address instead gets the page, which asks once.
const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function POST(req: NextRequest) {
  const t = await readToken(req.nextUrl.searchParams.get("t"));
  if (!t) return new Response(null, { status: 400, headers: HEADERS });
  return new Response(null, { status: (await unsubscribe(t)) ? 200 : 404, headers: HEADERS });
}

export function GET(req: NextRequest) {
  return Response.redirect(new URL(`/unsubscribe?t=${encodeURIComponent(req.nextUrl.searchParams.get("t") ?? "")}`, req.url), 303);
}
