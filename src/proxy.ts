import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { accessConfig, verifyAccessJwt } from "@/lib/access";
import { adminReachable, demoCookiesCount, isAppPath } from "@/lib/demo";
import { MODULES_COOKIE, conditionShown, moduleForPath, parseModules, pathAllowed } from "@/lib/modules-rules";
import { stock } from "@/lib/stock";

// Next 16 has no gone(); a rewrite with a status is the documented way to answer 410 (D-03).
// Make and body slugs never end in digits, so only a car-shaped slug reaches the provider.
const CAR_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*-\d+$/;

// The site's own not found page, not a bare line. A path no route matches renders app/not-found.tsx.
const notThere = (req: NextRequest) => NextResponse.rewrite(new URL("/not-found-closed-area", req.url), { status: 404, headers: { "X-Robots-Tag": "noindex" } });
// A module's page the plan lacks: a screen that says what the module does (app/not-in-plan, app/dashboard/not-in-plan). Public, a 404.
// In the dashboard a 200: the proxy cannot tell a page load from the router's refresh, and a refresh answered 404 reloads the whole page,
// losing the toast of the screen's own "Ask us to add". The dashboard is never indexed anyway.
const notInPlan = (req: NextRequest, prefix: string) =>
  NextResponse.rewrite(new URL(`${prefix}/not-in-plan/${moduleForPath(req.nextUrl.pathname)}`, req.url), { status: prefix ? 200 : 404, headers: { "X-Robots-Tag": "noindex" } });

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  // A module the dealer does not have (#173): its pages answer as if they were not there, public or dashboard, built ahead or not. On the
  // demo the bar's switches say; on a real site the build setting (src/lib/modules.ts).
  const modules = demoCookiesCount() ? parseModules(req.cookies.get(MODULES_COOKIE)?.value) : parseModules(process.env.NEXT_PUBLIC_SITE_MODULES);
  const allowed = pathAllowed(path, modules);
  // A real client site never advertises a module it lacks: the screen shows only where the demo bar's plan switch decides.
  if (!allowed && !isAppPath(path)) return demoCookiesCount() ? notInPlan(req, "") : notThere(req);
  // A closed area looks like a page that is not there. Server actions post to the page itself, so this covers them too.
  // Open in development and when the build says so; otherwise only with a valid Cloudflare Access token (src/lib/access.ts).
  if (isAppPath(path)) {
    const cfg = accessConfig();
    const token = req.headers.get("cf-access-jwt-assertion");
    const open = adminReachable();
    const who = open || cfg === null || !token ? null : await verifyAccessJwt(token, cfg);
    const verdict = open ? "open" : cfg === null ? "not-configured" : !token ? "no-token" : who ? "open" : "rejected";
    if (verdict === "open") {
      // Without the dashboard module there is no dealer area to show the screen in.
      if (!allowed) return modules.has("dashboard") ? notInPlan(req, "/dashboard") : notThere(req);
      // The pages and actions verify the token again themselves (src/lib/staff.ts): a server action can be posted to any page.
      return NextResponse.next();
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
  // A new car or a van has its page under /used-cars too: without its module (#173) it is not there, like /new-cars and /commercial.
  if (hit?.state === "live" && !conditionShown(modules, hit.car.condition)) return notThere(req);
  // The target is a constant prefix plus the provider's own make slug, never request input (T-02-08).
  return hit?.state === "gone" ? NextResponse.rewrite(new URL("/gone/" + hit.makeSlug, req.url), { status: 410 }) : NextResponse.next();
}

// The car pages (gone cars), the dashboard, and the public pages a module can switch off (MODULES in src/lib/modules-rules.ts).
export const config = {
  matcher: ["/used-cars/:slug", "/dashboard/:path*", "/trade-in", "/sell-your-car", "/finance", "/test-drive", "/find-a-car", "/service", "/reviews", "/commercial/:path*", "/new-cars/:path*"],
};
