import type { Metadata } from "next";
import { DEALER_ADDRESS, SITE_NAME, indexable } from "@/lib/site";
import { findMake } from "@/lib/stock/makes";
import type { Condition } from "@/lib/stock/types";

// The new cars and vans lists for one make (/new-cars/<make>, /commercial/<make>): the section's own list page with the make filter set.
// The used one is the landing page under /used-cars/<make>.
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const NAMES: Record<Exclude<Condition, "used">, (make: string) => string> = { new: (m) => `New ${m}`, commercial: (m) => `${m} vans and commercials` };

export async function makeListParams(slug: string, searchParams: SearchParams): Promise<Awaited<SearchParams> | null> {
  const make = await findMake(slug);
  if (!make) return null;
  return { ...(await searchParams), make: make.slug };
}

export async function makeListMetadata(kind: Exclude<Condition, "used">, slug: string): Promise<Metadata> {
  const make = await findMake(slug);
  if (!make) return {};
  const path = `/${kind === "new" ? "new-cars" : "commercial"}/${make.slug}`;
  const title = `${NAMES[kind](make.label)} for sale in ${DEALER_ADDRESS.town}`;
  return { title, description: `${NAMES[kind](make.label)} at ${SITE_NAME}, ${DEALER_ADDRESS.town}. Browse what we have and ask us about any of them.`, alternates: { canonical: path }, robots: { index: indexable() && make.byKind[kind] > 0 } };
}
