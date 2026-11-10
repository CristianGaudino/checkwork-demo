import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { accessConfig, verifyAccessJwt } from "@/lib/access";
import { adminReachable, isAppPath } from "@/lib/demo";
import { stock } from "@/lib/stock";

// Next 16 has no gone(); a rewrite with a status is the documented way to answer 410 (D-03).
// Make and body slugs never end in digits, so only a car-shaped slug reaches the provider.
const CAR_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*-\d+$/;

export async function proxy(req: NextRequest) {
  // A closed area looks like a page that is not there. Server actions post to the page itself, so this covers them too.
  // Open in development and when the build says so; otherwise only with a valid Cloudflare Access token (src/lib/access.ts).
  if (isAppPath(req.nextUrl.pathname)) {
    const cfg = accessConfig();
    const ok = adminReachable() || (cfg !== null && (await verifyAccessJwt(req.headers.get("cf-access-jwt-assertion"), cfg)) !== null);
    // The site's own not found page, not a bare line. A path no route matches renders app/not-found.tsx.
    return ok ? NextResponse.next() : NextResponse.rewrite(new URL("/not-found-closed-area", req.url), { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  }
  const slug = req.nextUrl.pathname.split("/")[2] ?? "";
  if (slug.length > 120 || !CAR_SLUG.test(slug)) return NextResponse.next();
  const hit = await stock.lookup(slug);
  // The target is a constant prefix plus the provider's own make slug, never request input (T-02-08).
  return hit?.state === "gone" ? NextResponse.rewrite(new URL("/gone/" + hit.makeSlug, req.url), { status: 410 }) : NextResponse.next();
}

export const config = { matcher: ["/used-cars/:slug", "/admin/:path*", "/platform/:path*"] };
