import type { Metadata } from "next";
import { DEALER_ADDRESS, SITE_NAME, indexable } from "@/lib/site";
import { findMake } from "@/lib/stock/makes";
import type { Condition } from "@/lib/stock/types";

// The new cars and vans lists for one make (/new-cars/<make>, /commercial/<make>): the section's own list page with the make filter set.
// The used one is the landing page under /used-cars/<make>.
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const NAMES: Record<Exclude<Condition, "used">, (make: string) => string> = { new: (m) => `New ${m}`, commercial: (m) => `${m} vans and commercials` };

// The list's params with the make set, and its heading, which names the make as the page title does ("New Kia").
export async function makeList(kind: Exclude<Condition, "used">, slug: string, searchParams: SearchParams): Promise<{ params: Awaited<SearchParams>; title: string } | null> {
  const make = await findMake(slug);
  if (!make) return null;
  return { params: { ...(await searchParams), make: make.slug }, title: NAMES[kind](make.label) };
}

export async function makeListMetadata(kind: Exclude<Condition, "used">, slug: string): Promise<Metadata> {
  const make = await findMake(slug);
  if (!make) return {};
  const path = `/${kind === "new" ? "new-cars" : "commercial"}/${make.slug}`;
  const title = `${NAMES[kind](make.label)} for sale in ${DEALER_ADDRESS.town}`;
  return { title, description: `${NAMES[kind](make.label)} at ${SITE_NAME}, ${DEALER_ADDRESS.town}. Browse what we have and ask us about any of them.`, alternates: { canonical: path }, robots: { index: indexable() && make.byKind[kind] > 0 } };
}
