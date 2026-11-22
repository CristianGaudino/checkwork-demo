import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { stock } from "@/lib/stock";

// Next 16 has no gone(); a rewrite with a status is the documented way to answer 410 (D-03).
// Make and body slugs never end in digits, so only a car-shaped slug reaches the provider.
const CAR_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*-\d+$/;

// The target is a constant prefix plus the provider's own make slug, never request input (T-02-08).
const gonePage = (makeSlug: string, status: number, req: NextRequest) => NextResponse.rewrite(new URL("/gone/" + makeSlug, req.url), { status });

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!path.startsWith("/used-cars/")) return NextResponse.next();
  const slug = path.split("/")[2] ?? "";
  if (slug.length > 120 || !CAR_SLUG.test(slug)) return NextResponse.next();
  const hit = await stock.lookup(slug);
  if (hit?.state === "gone") return gonePage(hit.makeSlug, 410, req);
  if (hit) return NextResponse.next();
  // A car link we never had or no longer keep (an old shared link): the same page as a 404, for the make the slug starts with.
  // Longest first, so mercedes-benz-... is Mercedes-Benz. A make we never listed falls through to the plain 404.
  const makes = (await stock.taxonomy().catch(() => null))?.makes ?? [];
  const make = makes.filter((m) => slug.startsWith(`${m.slug}-`)).sort((a, b) => b.slug.length - a.slug.length)[0];
  return make ? gonePage(make.slug, 404, req) : NextResponse.next();
}

// The car pages (gone cars). Every other public page is always there.
export const config = {
  matcher: ["/used-cars/:slug"],
};
