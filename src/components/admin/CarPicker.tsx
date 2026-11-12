"use client";

import { useState } from "react";
import { adminInput } from "@/components/admin/kit";
import { CarThumb } from "@/components/admin/CarThumb";
import { SearchIcon } from "@/components/stock/icons";
import { press } from "@/components/ui";
import type { CarCard } from "@/lib/admin/car-cards";

// Choosing a car from the stock: photo cards, two across on a phone, with a search on make and model. The new post and the test drive
// booking both start here. `hint` is a line of its own on a card (why it is worth a post). The first FIRST cards show (the page puts the likely
// ones first); the rest wait behind Show all, so a phone is not one long scroll. A search looks through every car.
const FIRST = 8;
export function CarPicker({ cars, value, onPick }: { cars: CarCard[]; value: string; onPick: (slug: string) => void }) {
  const [find, setFind] = useState("");
  const [all, setAll] = useState(false);
  const q = find.trim().toLowerCase();
  const found = q ? cars.filter((c) => c.title.toLowerCase().includes(q)) : cars;
  // The chosen car stays in view even when it is past the first few.
  const shown = all || q ? found : [...found.slice(0, FIRST), ...found.slice(FIRST).filter((c) => c.slug === value)];
  return (
    <div className="flex flex-col gap-4">
      <label className="relative block">
        <span className="sr-only">Search cars</span>
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-2" />
        <input type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search make or model" className={`${adminInput} w-full pl-9`} />
      </label>
      {shown.length === 0 ? (
        <p className="text-body text-text-2">No car for sale matches.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {shown.map((c) => (
            <li key={c.slug}>
              <button
                type="button"
                aria-pressed={c.slug === value}
                onClick={() => onPick(c.slug)}
                className={`flex h-full w-full flex-col overflow-hidden rounded-card border bg-card text-left ${c.slug === value ? "border-accent ring-2 ring-accent" : "border-hairline"} ${press}`}
              >
                <span className="block aspect-photo w-full bg-photo-bg">
                  <CarThumb src={c.photo} />
                </span>
                <span className="flex flex-1 flex-col gap-0.5 p-3">
                  <span className="line-clamp-2 text-meta font-medium">{c.title}</span>
                  <span className="text-meta tabular-nums text-text-2">
                    {c.price}
                    {c.days !== undefined && `, ${c.days === 1 ? "1 day" : `${c.days} days`} in stock`}
                  </span>
                  {c.hint && <span className="text-meta font-medium text-accent-text">{c.hint}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {shown.length < found.length && (
        <button type="button" onClick={() => setAll(true)} className="min-h-11 self-start text-meta font-medium text-accent-text underline">
          Show all {found.length} cars
        </button>
      )}
    </div>
  );
}
