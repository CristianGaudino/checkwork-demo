import type { MetadataRoute } from "next";
import { SITE_URL, indexable } from "@/lib/site";
import { parseModules, pathAllowed } from "@/lib/modules-rules";
import { queryAll } from "@/lib/stock";
import { isSold } from "@/lib/stock/types";
import { carHref } from "@/lib/stock/format";

// Cars leave the sold window without a deploy, so this must not be cached at build (RESEARCH Pitfall 5).
export const dynamic = "force-dynamic";

// A car page carries its listing date; no photos (they carry X-Robots-Tag: noindex).
// Landing pages are listed once each, only while a car of theirs is in stock (D-08, D-09).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexable()) return [];
  // Only the pages of the modules this dealer has (#173): the others answer 404, so they are never offered to a search engine.
  const modules = parseModules(process.env.NEXT_PUBLIC_SITE_MODULES);
  const { cars } = await queryAll({ sold: "include" });
  const others = [...(modules.has("newCars") ? (await queryAll({ condition: "new" })).cars : []), ...(modules.has("commercial") ? (await queryAll({ condition: "commercial" })).cars : [])];
  const landing = new Set(cars.filter((c) => !isSold(c)).flatMap((c) => [c.makeSlug, ...(c.bodySlug ? [c.bodySlug] : []), `${c.makeSlug}/${c.modelSlug}`]));
  const all: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/used-cars` },
    { url: `${SITE_URL}/new-cars` },
    { url: `${SITE_URL}/commercial` },
    { url: `${SITE_URL}/makes` },
    { url: `${SITE_URL}/finance` },
    { url: `${SITE_URL}/trade-in` },
    { url: `${SITE_URL}/sell-your-car` },
    { url: `${SITE_URL}/find-a-car` },
    { url: `${SITE_URL}/test-drive` },
    { url: `${SITE_URL}/service` },
    { url: `${SITE_URL}/warranty` },
    { url: `${SITE_URL}/reviews` },
    { url: `${SITE_URL}/faq` },
    { url: `${SITE_URL}/contact` },
    { url: `${SITE_URL}/about` },
    { url: `${SITE_URL}/terms` },
    { url: `${SITE_URL}/privacy` },
    ...[...landing].map((path) => ({ url: `${SITE_URL}/used-cars/${path}` })),
    // A make page, and its new and van lists, while a car of that make is in stock (the empty ones are noindex).
    ...[...new Set([...cars.filter((c) => !isSold(c)), ...others].map((c) => c.makeSlug))].map((m) => ({ url: `${SITE_URL}/makes/${m}` })),
    ...[...new Set(others.map((c) => `${c.condition === "new" ? "new-cars" : "commercial"}/${c.makeSlug}`))].map((p) => ({ url: `${SITE_URL}/${p}` })),
    ...[...cars, ...others].map((c) => ({ url: `${SITE_URL}${carHref(c.slug)}`, ...(c.listedAt && { lastModified: c.listedAt }) })),
  ];
  return all.filter((e) => pathAllowed(new URL(e.url).pathname, modules));
}
