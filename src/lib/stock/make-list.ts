import type { Metadata } from "next";
import { cache } from "react";
import { DEALER_ADDRESS, SITE_NAME, indexable } from "@/lib/site";
import { queryAllOrNull } from "@/lib/stock";
import { commercialBodyPath, landingFacts, landingIntro, landingMetadata, landingName, landingPath, type Facts, type Landing } from "@/lib/stock/landing";
import { findMake } from "@/lib/stock/makes";
import { searchOptions } from "@/lib/stock/search-options";
import { isSold, type Condition } from "@/lib/stock/types";

// The commercial list narrowed by its address (/commercial/<slug>): the section's own list page with a make or a body type set.
// A make first, as /used-cars/<slug> does, then a body type at its plural slug (/commercial/vans). The used ones are the landing pages
// under /used-cars.
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const NAMES: Record<Exclude<Condition, "used">, (make: string) => string> = { commercial: (m) => `${m} commercials` };

// A body type of the commercial stock for sale or sold lately, by its page slug. One with only sold ones keeps its page, empty and
// noindex, as a used body type does; one never listed is not found. Cached per request: the title and the page both ask.
export const commercialBody = cache(async (slug: string): Promise<{ bodySlug: string; landing: Landing; facts: Facts | null } | null> => {
  const all = (await queryAllOrNull({ condition: "commercial", sold: "include" }))?.cars ?? [];
  const body = searchOptions(all).bodies.find((b) => commercialBodyPath(b.slug) === `/commercial/${slug}`);
  if (!body) return null;
  const cars = all.filter((c) => c.bodySlug === body.slug && !isSold(c));
  return { bodySlug: body.slug, landing: { kind: "body", body: body.label, bodySlug: body.slug, commercial: true }, facts: cars.length ? landingFacts(cars) : null };
});

// The list's params with the make or body type set, and its heading: "Ford commercials", or "Used vans" with the landing intro.
export async function makeList(
  kind: Exclude<Condition, "used">,
  slug: string,
  searchParams: SearchParams,
): Promise<{ params: Awaited<SearchParams>; title: string; intro?: string } | null> {
  const make = await findMake(slug);
  if (make) return { params: { ...(await searchParams), make: make.slug }, title: NAMES[kind](make.label) };
  const body = await commercialBody(slug);
  if (!body) return null;
  return {
    params: { ...(await searchParams), body: body.bodySlug },
    title: `Used ${landingName(body.landing)}`,
    intro: body.facts ? landingIntro(body.landing, body.facts) : undefined,
  };
}

export async function makeListMetadata(kind: Exclude<Condition, "used">, slug: string): Promise<Metadata> {
  const make = await findMake(slug);
  if (!make) {
    const body = await commercialBody(slug);
    return body ? landingMetadata(body.landing, body.facts, landingPath(body.landing)) : {};
  }
  const path = `/${kind}/${make.slug}`;
  const title = `${NAMES[kind](make.label)} for sale in ${DEALER_ADDRESS.town}`;
  return { title, description: `${NAMES[kind](make.label)} at ${SITE_NAME}, ${DEALER_ADDRESS.town}. Browse what we have and ask us about any of them.`, alternates: { canonical: path }, robots: { index: indexable() && make.byKind[kind] > 0 } };
}
