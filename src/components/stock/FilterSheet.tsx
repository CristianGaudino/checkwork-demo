"use client";

import { useCloseAtDesktop } from "@/components/useCloseAtDesktop";
import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/Sheet";
import { appliedFilters, clearFilters } from "@/lib/stock/query";
import { SlidersIcon } from "./icons";
import { StockFilters } from "./StockFilters";
import { useStock } from "./StockShell";
import { accentButton, press } from "@/components/ui";


// Below 1024px the filter groups live only in this sheet; from 1024px the sidebar shows them and the sticky bar (and this button) is hidden.
export function FilterSheet() {
  const { query, summary, facets, pending, navigate } = useStock();
  // The groups are mounted only while the sheet is open or sliding away, so the page holds one copy of them, not two.
  const [mounted, setMounted] = useState(false);
  const unmountTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const applied = appliedFilters(query, facets).length;
  const total = summary?.total;
  // summary only changes when a new result lands, so while pending the button keeps the last known count.
  const label = total === undefined ? "Show cars" : total === 0 ? "No cars match" : total === 1 ? "Show 1 car" : `Show ${total} cars`;

  useCloseAtDesktop(() => setMounted(false)); // the bar is display:none now, so there is no slide-out to wait for
  useEffect(() => () => clearTimeout(unmountTimer.current), []);

  return (
    <Sheet
      title="Filters"
      closeLabel="Close filters"
      // shortcut: transitionend does not fire (the transitions are cancelled when the dialog goes display:none), so wait out the 320ms slide from globals.css.
      onClose={() => {
        unmountTimer.current = setTimeout(() => setMounted(false), 350);
      }}
      trigger={(open) => (
        <button
          type="button"
          onClick={(e) => {
            clearTimeout(unmountTimer.current);
            setMounted(true);
            open(e);
          }}
          // A box like the sort select beside it, so the two read as one row of controls.
          className={`inline-flex h-12 shrink-0 items-center gap-2 rounded-control border border-control bg-card px-3 text-meta font-semibold ${press}`}
        >
          <SlidersIcon className="h-6 w-6" />
          Filters
          {applied > 0 && (
            <span data-testid="filter-badge" className="inline-flex min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-meta text-on-accent">
              {applied}
            </span>
          )}
        </button>
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">
        {mounted && <StockFilters showSearch={false} />}
      </div>
      <div className="flex shrink-0 items-center gap-3 border-t border-hairline px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        {applied > 0 && (
          <button type="button" onClick={() => navigate(clearFilters(query))} className={`min-h-11 text-meta font-semibold underline ${press}`}>
            Clear all filters
          </button>
        )}
        <button
          type="button"
          disabled={total === 0}
          aria-busy={pending}
          onClick={(e) => e.currentTarget.closest("dialog")?.close()}
          className={`${accentButton} flex-1 disabled:bg-hairline disabled:text-text-2`}
        >
          {label}
        </button>
      </div>
    </Sheet>
  );
}
