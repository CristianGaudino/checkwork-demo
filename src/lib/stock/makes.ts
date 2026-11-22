import { cache } from "react";
import { everyKindOrNull, stock } from "@/lib/stock";
import { slugify } from "@/lib/stock/slug";
import { MAKE_OPTIONS, POPULAR_MAKES } from "@/lib/leads/makes";
import { isSold, type Car, type Condition } from "@/lib/stock/types";

// Every make the site has a page for (/makes/<slug>): the makes in stock, the makes it has ever listed, and the makes people in Ireland
// look for most, so a search for one lands on a real page even with none in stock.
export type MakeEntry = { slug: string; label: string; count: number; byKind: Record<Condition, number> };

const zero = (): Record<Condition, number> => ({ used: 0, new: 0, commercial: 0 });

// In stock first (most cars first), then the popular makes in the order people ask for them. `all` adds every other known make A to Z.
// Cached per request (React `cache`): a make page asks for it in its title, its page and its cars, and pays once.
export const makeDirectory = cache(async (all = false): Promise<MakeEntry[]> => { // a plain argument: cache matches by identity
  const cars = ((await everyKindOrNull()) ?? []).filter((c) => !isSold(c));
  const bySlug = new Map<string, MakeEntry>();
  for (const c of cars) {
    const e = bySlug.get(c.makeSlug) ?? { slug: c.makeSlug, label: c.make, count: 0, byKind: zero() };
    e.count++;
    e.byKind[c.condition ?? "used"]++;
    bySlug.set(c.makeSlug, e);
  }
  const inStock = [...bySlug.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "en-IE"));
  const add = (labels: string[]) =>
    labels.map((label) => ({ slug: slugify(label), label })).filter((m) => !bySlug.has(m.slug) && bySlug.set(m.slug, { ...m, count: 0, byKind: zero() }));
  const popular = add(POPULAR_MAKES).map((m) => bySlug.get(m.slug)!);
  if (!all) return [...inStock, ...popular];
  const listed = (await stock.taxonomy().catch(() => null))?.makes.map((m) => m.label) ?? [];
  const rest = add([...listed, ...MAKE_OPTIONS.filter((o) => o.value).map((o) => o.label)])
    .map((m) => bySlug.get(m.slug)!)
    .sort((a, b) => a.label.localeCompare(b.label, "en-IE"));
  return [...inStock, ...popular, ...rest];
});

export async function findMake(slug: string): Promise<MakeEntry | null> {
  return (await makeDirectory(true)).find((m) => m.slug === slug) ?? null;
}

// Every car of a make in stock, of every kind, newest first.
export async function carsOfMake(slug: string): Promise<Car[]> {
  return ((await everyKindOrNull()) ?? []).filter((c) => c.makeSlug === slug && !isSold(c)).sort((a, b) => Number(b.id) - Number(a.id));
}
