"use client";

import { UnitToggle } from "@/components/UnitToggle";
import Link from "next/link";
import { StateBlock } from "@/components/StateBlock";
import { Tween } from "@/components/Tween";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";
import { count, countFilters } from "@/lib/count-client";
import { missedMake } from "@/lib/visit-rules";
import { countLabel } from "@/lib/stock/format";
import { appliedFilters, clearFilters, sourcingHref, stockHref } from "@/lib/stock/query";
import { SORT_KEYS } from "@/lib/stock/types";
import type { Facets, SortKey, StockQuery } from "@/lib/stock/types";
import { AppliedFilters } from "./AppliedFilters";
import { rememberList, rememberScroll, takeScroll } from "./BackToCars";
import { FilterSheet } from "./FilterSheet";
import { Combobox } from "@/components/Combobox";
import { GridIcon, ListIcon } from "./icons";
import { SearchBox, StockFilters } from "./StockFilters";
import { stateButton } from "./StockError";
import { setView, useView } from "./view";
import { pageMain, subTitle } from "@/components/ui";
import { VEHICLE_TYPES } from "@/lib/nav";

type Summary = { total: number; facets: Facets } | null;
type Stock = {
  query: StockQuery;
  summary: Summary;
  facets: Facets | null; // the facets of the last result that loaded, so a failed load keeps the filters
  pending: boolean;
  navigate: (next: StockQuery, opts?: { scroll?: boolean }) => void;
};

const StockContext = createContext<Stock | null>(null);

export function useStock(): Stock {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error("useStock must be used inside StockShell");
  return ctx;
}

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest listed",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "year-desc": "Year: newest first",
  "km-asc": "Mileage: lowest first",
};

function SortControl({ className }: { className: string }) {
  const { query, navigate } = useStock();
  const id = useId();
  return (
    <div className={`min-w-0 items-center gap-2 ${className}`}>
      <label htmlFor={id} className="sr-only text-meta font-semibold sm:not-sr-only">
        Sort
      </label>
      <Combobox
        id={id}
        value={query.sort}
        onChange={(v) => {
          const sort = SORT_KEYS.find((k) => k === v);
          if (sort) navigate({ ...query, sort, page: 1 });
        }}
        options={SORT_KEYS.map((k) => ({ value: k, label: SORT_LABELS[k] }))}
        className="pl-3"
      />
    </div>
  );
}

// Two icon buttons, the active one red, as in the mockup. From 1024px only, with the sidebar: below that the cards are always a grid.
function ViewToggle() {
  const view = useView();
  const btn = (v: "grid" | "list", label: string, Icon: typeof GridIcon) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={view === v}
      onClick={() => setView(v)}
      className={`flex h-full w-12 items-center justify-center transition-colors ${view === v ? "bg-accent text-on-accent" : "hover:bg-hairline"}`}
    >
      <Icon className="size-6" />
    </button>
  );
  return (
    <div role="group" aria-label="Layout" className="flex h-12 overflow-hidden rounded-control border border-control">
      {btn("grid", "Grid view", GridIcon)}
      {btn("list", "List view", ListIcon)}
    </div>
  );
}

// `orderable`: new cars can be ordered from the factory here (our stock only), so the New cars page links to the order form.
export function StockShell({ query, title, summary, orderable, children }: { query: StockQuery; title?: string; summary: Summary; orderable?: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const view = useView();
  const [optimisticQuery, setOptimisticQuery] = useOptimistic(query);
  const [held, setHeld] = useState(summary?.facets ?? null);
  if (summary && summary.facets !== held) setHeld(summary.facets); // adjusting state during render, not an effect
  useEffect(() => rememberList(query), [query]); // so the car page can link back to this list

  // Back from a car with the Stock link: return to the place in the list the buyer left (the browser's own Back button restores it itself).
  useEffect(() => {
    const y = takeScroll(query);
    if (y !== null) requestAnimationFrame(() => window.scrollTo(0, y));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  // A new filter or sort starts the list again, so the page returns to the top of the results if the buyer had scrolled past it. Without
  // this, results that are fewer than the buyer had scrolled through shorten the page and push the sticky filter panel up with them.
  const results = useRef<HTMLDivElement>(null);
  const listKey = stockHref({ ...query, page: 1 });
  const seenKey = useRef(listKey);
  useEffect(() => {
    if (seenKey.current === listKey) return; // arriving, or coming back to a scroll position the browser restores: leave it
    seenKey.current = listKey;
    const el = results.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  }, [listKey]);
  const navigate: Stock["navigate"] = (next, { scroll = false } = {}) =>
    startTransition(() => {
      countFilters(optimisticQuery, next);
      setOptimisticQuery(next);
      router.replace(stockHref(next), { scroll });
    });

  const kind = VEHICLE_TYPES.find((t) => t.condition === (optimisticQuery.condition ?? "used"))!;
  return (
    <StockContext value={{ query: optimisticQuery, summary, facets: summary ? summary.facets : held, pending, navigate }}>
      <main className={pageMain}>
        {/* From 1024px the title is on the left and the count, sort and layout toggle on the right, level with it, so the filters and the cars
            start higher. Below that the count sits under the intro (sort is in the sticky bar). */}
        <div className="lg:flex lg:items-end lg:justify-between lg:gap-8">
          <div>
            <h1 className="text-display font-bold lg:text-hero">{title ?? kind.title}</h1>
            <p className="mt-2 max-w-measure text-pretty text-body text-text-2">{kind.intro}</p>
            {orderable && kind.condition === "new" && (
              <Link href="/new-cars/order" className="mt-2 inline-flex min-h-11 items-center text-body font-semibold text-accent-text underline">
                Not the spec you want? Order one from the factory
              </Link>
            )}
            {/* Under the intro and above the count on a phone; from 1024px the search is in the filter panel. */}
            <div className="mt-4 lg:hidden">
              <SearchBox />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 lg:mt-0 lg:justify-end lg:gap-6">
            <p aria-live="polite" data-testid="count" className="text-heading font-semibold">
              {summary && <Tween value={countLabel(summary.total)} />}
            </p>
          </div>
        </div>
        <div className="mt-6 lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
          <aside className="hidden lg:block lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto lg:rounded-card lg:bg-card lg:p-4">
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-hairline pb-4">
              <h2 className={subTitle}>Filters</h2>
              <button type="button" onClick={() => navigate(clearFilters(optimisticQuery))} className="min-h-11 text-meta font-semibold underline">
                Clear all
              </button>
            </div>
            <StockFilters />
          </aside>
          {/* A minimum height, so a filter that leaves few cars does not shrink the page: the page would jump and the sticky panel move. */}
          <div ref={results} onClickCapture={(e) => e.target instanceof Element && e.target.closest("a[href^='/used-cars/']") && rememberScroll(query)} className="min-w-0 scroll-mt-16 lg:min-h-[100dvh] lg:scroll-mt-6">
            <div
              data-testid="sticky-bar"
              className="sticky top-14 z-20 lg:static -mx-4 flex h-14 items-center justify-between gap-2 bg-surface/80 px-4 backdrop-blur-[20px] backdrop-saturate-[1.8] sm:-mx-6 sm:px-6 lg:mx-0 lg:justify-end lg:gap-3 lg:bg-transparent lg:px-0 lg:backdrop-blur-none lg:backdrop-saturate-100 reduce-transparency:bg-surface reduce-transparency:backdrop-blur-none reduce-transparency:backdrop-saturate-100"
            >
              <div className="lg:hidden">
                <FilterSheet />
              </div>
              {/* km or miles for every card on the list: a view, not a filter. */}
              <UnitToggle className="h-12 max-lg:hidden" />
              <SortControl className="flex" />
              <div className="hidden lg:block">
                <ViewToggle />
              </div>
            </div>
            <AppliedFilters />
            <div data-view={view} aria-busy={pending} className={`transition-opacity duration-150 ease-out ${pending ? "opacity-60" : ""}`}>
              {children}
            </div>
          </div>
        </div>
      </main>
    </StockContext>
  );
}

export function EmptyState() {
  const { query, facets, navigate } = useStock();
  const filtered = appliedFilters(query, null).length > 0;
  useEffect(() => {
    if (filtered) count("no-results");
  }, [filtered]);
  const missed = filtered ? missedMake(query) : null;
  useEffect(() => {
    if (missed) count(`missed:${missed}`);
  }, [missed]);
  // With nothing applied there is no filter to remove: the stock itself is empty.
  if (appliedFilters(query, null).length === 0) {
    return (
      <StateBlock title="No cars listed right now" text="New cars arrive often.">
        <Link href="/find-a-car" className="mx-auto flex min-h-11 w-fit items-center text-body underline">
          Can&apos;t find it? Ask us to find it for you.
        </Link>
      </StateBlock>
    );
  }
  return (
    <StateBlock title="No cars match these filters" text="Try removing a filter.">
      <Link href={sourcingHref(query, facets)} className="mx-auto flex min-h-11 w-fit items-center text-body underline">
        Can&apos;t find it? Ask us to find it for you.
      </Link>
      <button type="button" onClick={() => navigate(clearFilters(query))} className={stateButton}>
        Clear all filters
      </button>
    </StateBlock>
  );
}
