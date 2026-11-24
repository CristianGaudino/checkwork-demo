import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StockError } from "@/components/stock/StockError";
import { StockResults } from "@/components/stock/StockResults";
import { StockShell } from "@/components/stock/StockShell";
import { DEALER_LOCATION, SITE_NAME, indexable } from "@/lib/site";
import { stock } from "@/lib/stock";
import { LIST_PATHS, parseStockQuery, stockHref } from "@/lib/stock/query";
import type { Condition } from "@/lib/stock/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const DESCRIPTIONS: Record<Condition, string> = {
  used: `Browse the used cars in stock at ${SITE_NAME} in ${DEALER_LOCATION}. Filter by make, model, price, year and more.`,
  commercial: `Browse the vans and light commercial vehicles at ${SITE_NAME} in ${DEALER_LOCATION}, priced without VAT. Filter by make, model, price and more.`,
};
const TITLES: Record<Condition, string> = { used: "Used cars", commercial: "Commercial vehicles" };

// Filtered and sorted lists duplicate the landing pages, so only the bare list is indexable.
export async function stockListMetadata(condition: Condition, searchParams: SearchParams): Promise<Metadata> {
  const bare = Object.keys(await searchParams).length === 0;
  return { title: TITLES[condition], description: DESCRIPTIONS[condition], alternates: { canonical: LIST_PATHS[condition] }, robots: { index: indexable() && bare } };
}

// The list page for every kind of vehicle: the same filters, sort, grid and list view. The kind only decides which cars are in it.
// `title`: a heading in place of the kind's own, for a list already narrowed to one make.
export async function StockListPage({ condition, searchParams, title }: { condition: Condition; searchParams: SearchParams; title?: string }) {
  const query = parseStockQuery(await searchParams, condition);
  // No error.tsx: it would replace the whole segment and take Sort and the filters with it.
  // Log a constant message and the error name only: never the query, params or URL (T-01-29), they can hold search text.
  const result = await stock.query(query).catch((e: unknown) => {
    console.error("stock.query failed", e instanceof Error ? e.name : typeof e);
    return null;
  });
  // Constant list path plus serialised params, never a user URL (T-01-14).
  if (result && result.pageCount > 0 && query.page > result.pageCount) redirect(stockHref({ ...query, page: result.pageCount }));
  return (
    <StockShell query={query} title={title} summary={result && { total: result.total, facets: result.facets }}>
      {result ? <StockResults result={result} query={query} /> : <StockError />}
    </StockShell>
  );
}
