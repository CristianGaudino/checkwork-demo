import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { accessConfig, verifyAccessJwt } from "@/lib/access";
import { adminReachable, demoCookiesCount, isAppPath } from "@/lib/demo";
import { MODULES_COOKIE, parseModules, pathAllowed } from "@/lib/modules-rules";
import { stock } from "@/lib/stock";

// Next 16 has no gone(); a rewrite with a status is the documented way to answer 410 (D-03).
// Make and body slugs never end in digits, so only a car-shaped slug reaches the provider.
const CAR_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*-\d+$/;

// The site's own not found page, not a bare line. A path no route matches renders app/not-found.tsx.
const notThere = (req: NextRequest) => NextResponse.rewrite(new URL("/not-found-closed-area", req.url), { status: 404, headers: { "X-Robots-Tag": "noindex" } });

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  // A module the dealer does not have (#173): its pages answer as if they were not there, public or dashboard, built ahead or not. On the
  // demo the bar's switches say; on a real site the build setting (src/lib/modules.ts).
  const modules = demoCookiesCount() ? parseModules(req.cookies.get(MODULES_COOKIE)?.value) : parseModules(process.env.NEXT_PUBLIC_SITE_MODULES);
  const allowed = pathAllowed(path, modules);
  if (!allowed && !isAppPath(path)) return notThere(req);
  // A closed area looks like a page that is not there. Server actions post to the page itself, so this covers them too.
  // Open in development and when the build says so; otherwise only with a valid Cloudflare Access token (src/lib/access.ts).
  if (isAppPath(path)) {
    const cfg = accessConfig();
    const token = req.headers.get("cf-access-jwt-assertion");
    const open = adminReachable();
    const who = open || cfg === null || !token ? null : await verifyAccessJwt(token, cfg);
    const verdict = open ? "open" : cfg === null ? "not-configured" : !token ? "no-token" : who ? "open" : "rejected";
    if (verdict === "open") {
      if (!allowed) return notThere(req);
      // The verified address goes on to the pages (src/lib/permissions.ts). Whatever the browser sent in that header is thrown away first.
      const forward = new Headers(req.headers);
      forward.delete("x-admin-email");
      if (who?.email) forward.set("x-admin-email", who.email);
      return NextResponse.next({ request: { headers: forward } });
    }
    // Why it was closed, in the Worker's logs (never the token): "no-token" means Access did not cover this path, "rejected" means a token came
    // that did not verify (wrong audience, team domain or expired), "not-configured" means CF_ACCESS_TEAM_DOMAIN or CF_ACCESS_AUD is missing.
    console.warn(`dashboard gate closed: ${verdict}`);
    return notThere(req);
  }
  if (!path.startsWith("/used-cars/")) return NextResponse.next();
  const slug = path.split("/")[2] ?? "";
  if (slug.length > 120 || !CAR_SLUG.test(slug)) return NextResponse.next();
  const hit = await stock.lookup(slug);
  // The target is a constant prefix plus the provider's own make slug, never request input (T-02-08).
  return hit?.state === "gone" ? NextResponse.rewrite(new URL("/gone/" + hit.makeSlug, req.url), { status: 410 }) : NextResponse.next();
}

// The car pages (gone cars), the dashboard, and the public pages a module can switch off (MODULES in src/lib/modules-rules.ts).
export const config = {
  matcher: ["/used-cars/:slug", "/dashboard/:path*", "/trade-in", "/sell-your-car", "/finance", "/test-drive", "/find-a-car", "/service", "/reviews", "/commercial/:path*", "/new-cars/:path*"],
};
