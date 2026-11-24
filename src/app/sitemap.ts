import type { MetadataRoute } from "next";
import { SITE_URL, indexable } from "@/lib/site";
import { queryAll } from "@/lib/stock";
import { isSold } from "@/lib/stock/types";
import { carHref } from "@/lib/stock/format";

// Cars leave the sold window without a deploy, so this must not be cached at build (RESEARCH Pitfall 5).
export const dynamic = "force-dynamic";

// A car page carries its listing date; no photos (they carry X-Robots-Tag: noindex).
// Landing pages are listed once each, only while a car of theirs is in stock (D-08, D-09).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexable()) return [];
  const { cars } = await queryAll({ sold: "include" });
  const others = (await queryAll({ condition: "commercial" })).cars;
  const landing = new Set(cars.filter((c) => !isSold(c)).flatMap((c) => [c.makeSlug, ...(c.bodySlug ? [c.bodySlug] : []), `${c.makeSlug}/${c.modelSlug}`]));
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/used-cars` },
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
    // A make page, and its van list, while a car of that make is in stock (the empty ones are noindex).
    ...[...new Set([...cars.filter((c) => !isSold(c)), ...others].map((c) => c.makeSlug))].map((m) => ({ url: `${SITE_URL}/makes/${m}` })),
    ...[...new Set(others.map((c) => c.makeSlug))].map((m) => ({ url: `${SITE_URL}/commercial/${m}` })),
    ...[...cars, ...others].map((c) => ({ url: `${SITE_URL}${carHref(c.slug)}`, ...(c.listedAt && { lastModified: c.listedAt }) })),
  ];
}
