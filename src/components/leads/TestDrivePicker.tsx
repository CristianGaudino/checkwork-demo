"use client";

import { useRef, useState } from "react";
import { LeadDialog, TestDriveForm } from "./LeadDialog";
import type { CarSummary } from "./LeadDialog";
import { CalendarIcon } from "@/components/stock/icons";
import { card, press, secondaryButton } from "@/components/ui";

// Every car in stock with a Book button. One dialog, one form: choosing another car re-keys the form so it never books the wrong car.
export function TestDrivePicker({ cars }: { cars: CarSummary[] }) {
  const [car, setCar] = useState<CarSummary | null>(null);
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cars.map((c) => (
          <li key={c.id} className={`flex gap-3 p-3 ${card}`}>
            {c.photo && (
              <img src={c.photo} alt="" width={96} height={72} loading="lazy" className="hidden h-[72px] w-24 shrink-0 min-[380px]:block rounded-control bg-photo-bg object-cover" />
            )}
            {/* Book sits at the bottom right, under the text, so the name and variant get the row's full width on a phone. */}
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="font-semibold">{c.name}</p>
              {/* The name already says the make and model: the line under it is what tells two of them apart. */}
              {c.variant && <p className="text-meta text-text-2">{c.variant}</p>}
              <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                <p className="text-meta font-semibold whitespace-nowrap">{c.price}</p>
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
              </div>
            </div>
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
