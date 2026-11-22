"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { showToast } from "@/components/toast";
import { ChevronDownIcon, SwapIcon } from "@/components/stock/icons";
import { clearCompare, MAX_COMPARE, restoreCompare, toggleCompare, useCompareIds } from "@/lib/compare/store";
import { press } from "@/components/ui";
import { COMPARE_CLEARED } from "@/lib/copy";

// A pill at the bottom of every page once a car is picked for comparison. Not on /compare itself. The layout places it.
// It folds down to a small round button, so it never has to sit over a form or the footer. Held for the visit, not across reloads.
export function CompareBar() {
  const ids = useCompareIds();
  const path = usePathname();
  // null until first folded; after that the button swapped in takes focus, so a keyboard user is not dropped on the page.
  const [small, setSmall] = useState<boolean | null>(null);
  const carId = /^\/used-cars\/[a-z0-9-]+-(\d{1,12})$/.exec(path)?.[1];
  if (ids.length === 0 && small !== null) setSmall(null); // a new list opens full, and takes no focus
  if (ids.length === 0 || path === "/compare") return null;
  if (small) {
    return (
      <div data-compare-bar role="region" aria-label="Compare cars" className="pointer-events-auto self-end">
        <button
          type="button"
          autoFocus
          aria-label={`Show compare, ${ids.length} of ${MAX_COMPARE}`}
          onClick={() => setSmall(false)}
          className={`flex h-11 items-center gap-1.5 rounded-full border border-hairline bg-card px-3 text-meta font-semibold shadow-lift ${press}`}
        >
          <SwapIcon className="size-5" />
          {ids.length}
        </button>
      </div>
    );
  }
  return (
    <div data-compare-bar role="region" aria-label="Compare cars" className="pointer-events-auto flex items-center gap-3 rounded-control border border-hairline bg-card py-1 pl-4 pr-1 shadow-lift transition-[opacity,translate] duration-200 starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none">
      <p className="text-meta font-semibold">
        {ids.length} of {MAX_COMPARE} to compare
      </p>
      <button
        type="button"
        onClick={() => {
          clearCompare();
          showToast(COMPARE_CLEARED, () => restoreCompare(ids));
        }}
        className="min-h-11 rounded-control px-2 text-meta font-semibold underline"
      >
        Clear
      </button>
      <Link
        href="/compare"
        onClick={() => {
          // On a car page the car in view joins the list, so Compare opens it with that car in it.
          if (carId && !ids.includes(carId) && ids.length < MAX_COMPARE) toggleCompare(carId);
        }}
        className={`inline-flex h-11 items-center rounded-control bg-accent px-5 text-meta font-semibold text-on-accent ${press}`}
      >
        Compare
      </Link>
      <button type="button" autoFocus={small === false} aria-label="Hide" onClick={() => setSmall(true)} className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-control">
        <ChevronDownIcon className="size-5" />
      </button>
    </div>
  );
}
