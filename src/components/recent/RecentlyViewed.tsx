"use client";

import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import { ListingCard } from "@/components/stock/ListingCard";
import { useCarsByIds } from "@/components/stock/useCarsByIds";
import { sectionTitle, textLink } from "@/components/ui";
import { clearRecent, noteViewed, removeRecent, useRecentIds } from "@/lib/recent/store";
import { useSavedIds } from "@/lib/saved/store";

const never = () => () => {};

// On a car page: remembers that this browser opened it. Draws nothing.
export function ViewedCar({ id }: { id: string }) {
  useEffect(() => {
    noteViewed(id);
  }, [id]);
  return null;
}

// The cars this browser opened last, so a buyer can go back to one they did not save. Nothing on the server and nothing until the cars
// arrive (it sits below the fold, so its arrival moves nothing in view), and nothing at all on a failed load: it is a shortcut, not content.
// `notSaved`: leave out saved cars, on the page that already lists them.
export function RecentlyViewed({ max, notSaved = false }: { max: number; notSaved?: boolean }) {
  const all = useRecentIds();
  const live = useSavedIds();
  // The saved list as the page opened, as SavedCars takes it: a car unsaved there keeps its card (for Undo), so it must not also show here.
  // False on the server and during hydration, when the saved list still reads empty.
  const read = useSyncExternalStore(never, () => true, () => false);
  const [saved, setSaved] = useState<string[] | null>(null);
  if (notSaved && read && saved === null) setSaved(live); // adjusting state during render, not an effect
  // Memoised: a new array on every render would fetch on every render. Waits for the saved list where it matters.
  const ids = useMemo(() => (notSaved && !saved ? [] : all.filter((id) => !saved?.includes(id)).slice(0, max)), [all, saved, notSaved, max]);
  const { loaded } = useCarsByIds(ids.length ? ids : null, removeRecent);
  const heading = useId();
  const cars = loaded && loaded !== "error" ? loaded.cars.filter((c) => ids.includes(c.id)) : [];
  if (!cars.length) return null;
  return (
    <section aria-labelledby={heading} className="flex flex-col gap-4 transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:transition-none">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 id={heading} className={sectionTitle}>
          Recently viewed
        </h2>
        <button type="button" onClick={clearRecent} className={`${textLink} text-text-2`}>
          Clear
        </button>
      </div>
      {/* As Featured stock: a row to swipe on a phone, a grid from 640px. */}
      <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 lg:gap-6">
        {cars.map((car) => (
          <li key={car.id} className="w-[85%] min-w-0 shrink-0 snap-start sm:w-auto">
            <ListingCard car={car} priority={false} oneLine />
          </li>
        ))}
      </ul>
    </section>
  );
}
