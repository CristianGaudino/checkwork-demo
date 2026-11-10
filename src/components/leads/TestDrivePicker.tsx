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
      <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cars.map((c) => (
          <li key={c.id} className={`flex items-center gap-3 p-3 ${card}`}>
            {c.photo && (
              // eslint-disable-next-line @next/next/no-img-element -- a local /stock file at a fixed small size
              <img src={c.photo} alt="" width={96} height={72} loading="lazy" className="hidden h-[72px] w-24 shrink-0 min-[380px]:block rounded-control bg-photo-bg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{c.name}</p>
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
              <CalendarIcon className="size-5 text-accent" />
              Book
            </button>
          </li>
        ))}
      </ul>
      <LeadDialog
        title="Test Drive"
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
