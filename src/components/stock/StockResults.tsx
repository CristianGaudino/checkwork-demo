import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/stock/icons";
import { fmtNum } from "@/lib/stock/format";
import { stockHref } from "@/lib/stock/query";
import type { StockQuery, StockResult } from "@/lib/stock/types";
import { ListingCard } from "./ListingCard";
import { EmptyState } from "./StockShell";

// One segment of the pager: a hairline-divided button, the current page filled.
const seg = "flex min-h-11 min-w-11 items-center justify-center gap-1 px-3 text-meta font-semibold tabular-nums transition-colors";
const segLink = `${seg} hover:bg-hairline active:bg-hairline`;
// Off: the label stays readable (AA), only the chevron dims, and nothing reacts to a tap.
const segOff = `${seg} pointer-events-none text-text-2 [&>svg]:opacity-40`;

// The pages to show: the first, the last, and the ones either side of this one, with a gap marked by null.
function pagesToShow(page: number, count: number): (number | null)[] {
  const keep = [...new Set([1, page - 1, page, page + 1, count])].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  return keep.flatMap((p, i) => (i > 0 && p - keep[i - 1] > 1 ? [null, p] : [p]));
}

export function StockResults({ result, query }: { result: StockResult; query: StockQuery }) {
  const { cars, page, pageCount } = result;
  const first = (page - 1) * query.pageSize + 1;
  if (result.total === 0) return <EmptyState />;
  return (
    <>
      <div data-grid className="mt-2 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2">
        {cars.map((car, i) => (
          <ListingCard key={car.id} car={car} priority={i < 2} />
        ))}
      </div>
      <Pager page={page} pageCount={pageCount} first={first} shown={cars.length} total={result.total} href={(p) => stockHref({ ...query, page: p })} />
    </>
  );
}

// Previous, the page numbers and Next, for any public list that pages through the URL (stock, the test drive list).
export function Pager({ page, pageCount, first, shown, total, href }: { page: number; pageCount: number; first: number; shown: number; total: number; href: (page: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-col items-center gap-3">
      <ul className="inline-flex max-w-full divide-x divide-control overflow-hidden rounded-control border border-control bg-card">
        <li>
          {page > 1 ? (
            <Link replace href={href(page - 1)} aria-label="Previous page" className={segLink}>
              <ChevronLeftIcon className="size-5" />
              <span className="hidden sm:inline">Previous</span>
            </Link>
          ) : (
            <span aria-hidden="true" className={segOff}>
              <ChevronLeftIcon className="size-5" />
              <span className="hidden sm:inline">Previous</span>
            </span>
          )}
        </li>
        {/* A phone has room for "Page 2 of 5"; from 640px the numbers show. */}
        <li className="flex items-center px-4 text-meta sm:hidden">
          Page {page} of {pageCount}
        </li>
        {pagesToShow(page, pageCount).map((p, i) =>
          p === null ? (
            <li key={`gap-${i}`} aria-hidden="true" className={`${seg} hidden text-text-2 sm:flex`}>
              …
            </li>
          ) : (
            <li key={p} className="hidden sm:block">
              {p === page ? (
                <span aria-current="page" aria-label={`Page ${p}, current page`} className={`${seg} bg-accent text-on-accent`}>
                  {p}
                </span>
              ) : (
                <Link replace href={href(p)} aria-label={`Page ${p}`} className={segLink}>
                  {p}
                </Link>
              )}
            </li>
          ),
        )}
        <li>
          {page < pageCount ? (
            <Link replace href={href(page + 1)} aria-label="Next page" className={segLink}>
              <span className="hidden sm:inline">Next</span>
              <ChevronRightIcon className="size-5" />
            </Link>
          ) : (
            <span aria-hidden="true" className={segOff}>
              <span className="hidden sm:inline">Next</span>
              <ChevronRightIcon className="size-5" />
            </span>
          )}
        </li>
      </ul>
      <p className="text-meta text-text-2">
        Showing {fmtNum(first)} to {fmtNum(first + shown - 1)} of {fmtNum(total)} cars
      </p>
    </nav>
  );
}
