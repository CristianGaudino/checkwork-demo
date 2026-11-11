"use client";

import { useRef, useState } from "react";
import { LeadDialog, TestDriveForm } from "./LeadDialog";
import type { CarSummary } from "./LeadDialog";
import { CalendarIcon, SearchIcon } from "@/components/stock/icons";
import { SEARCH_MAKE_MODEL } from "@/lib/copy";
import { card, press, secondaryButton } from "@/components/ui";

// Every car in stock with a Book button. One dialog, one form: choosing another car re-keys the form so it never books the wrong car.
export function TestDrivePicker({ cars }: { cars: CarSummary[] }) {
  const [car, setCar] = useState<CarSummary | null>(null);
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null);
  // A list of every car is long on a phone: typing narrows it at once. Search ignores case and accents, as the stock search does.
  const [q, setQ] = useState("");
  const fold = (t: string) => t.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const shown = q.trim() ? cars.filter((c) => fold(`${c.name} ${c.title}`).includes(fold(q.trim()))) : cars;
  return (
    <>
      <div className="relative mt-4 sm:max-w-sm">
        <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-text-2" />
        <input
          type="search"
          aria-label={SEARCH_MAKE_MODEL}
          placeholder={SEARCH_MAKE_MODEL}
          maxLength={80}
          enterKeyHint="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="h-12 w-full rounded-control border border-control bg-card pl-10 pr-4 text-body"
        />
      </div>
      {shown.length === 0 && <p className="mt-4 text-body text-text-2">No car matches. Try a make or a model, or call us.</p>}
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {shown.map((c) => (
          <li key={c.id} className={`flex items-center gap-3 p-3 ${card}`}>
            {c.photo && (
              // eslint-disable-next-line @next/next/no-img-element -- a local /stock file at a fixed small size
              <img src={c.photo} alt="" width={96} height={72} loading="lazy" className="hidden h-[72px] w-24 shrink-0 min-[380px]:block rounded-control bg-photo-bg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-semibold">{c.name}</p>
              <p className="truncate text-meta text-text-2">{c.title}</p>
              <p className="text-meta font-semibold whitespace-nowrap">{c.price}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                opener.current = e.currentTarget;
                setCar(c);
                setOpen(true);
              }}
              className={`flex h-11 shrink-0 items-center gap-2 px-3 ${secondaryButton} ${press}`}
            >
              <CalendarIcon className="size-5 text-accent-text" />
              Book
            </button>
          </li>
        ))}
      </ul>
      <LeadDialog
        title="Test drive"
        open={open}
        onClose={() => {
          setOpen(false);
          opener.current?.focus();
        }}
      >
        {/* Keyed by the car, so choosing another one never books the wrong car. */}
        {car && <TestDriveForm key={car.id} car={car} />}
      </LeadDialog>
    </>
  );
}
