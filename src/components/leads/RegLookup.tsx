"use client";

import { useRef, useState, useTransition } from "react";
import { lookupRegAction } from "@/app/actions/reg";
import { SearchIcon } from "@/components/stock/icons";
import { secondaryButton } from "@/components/ui";
import { regSummary } from "@/lib/reg";
import type { CarFound, RegLookup as Found } from "@/lib/reg-lookup";

// The "Look up" beside a registration box, on the visitor's forms. It asks the server (src/lib/reg-lookup.ts) and hands
// what came back to `onFound`; the form decides which boxes to fill (never one the person already typed in). The line under it says what
// the plate shows, or that it is not an Irish registration.
// Pressing again for the same plate reuses the last answer: a repeat never reaches the server, let alone the paid service.
const plate = (reg: string) => reg.toUpperCase().replace(/[^A-Z0-9]/g, "");
export function RegLookup({ reg, onFound, className = "" }: { reg: string; onFound?(found: { year: number; car?: CarFound }): void; className?: string }) {
  const [said, setSaid] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const last = useRef<{ plate: string; r: Found } | null>(null);
  const look = () =>
    start(async () => {
      const r: Found | null = last.current?.plate === plate(reg) ? last.current.r : await lookupRegAction(reg).catch(() => null);
      if (r) last.current = { plate: plate(reg), r };
      if (!r) return setSaid("We could not read that as an Irish registration. Fill in the details below.");
      onFound?.({ year: r.year, car: r.car });
      setSaid(r.car ? `${r.car.make} ${r.car.model}. ${regSummary(r)}.` : `${regSummary(r)}.`);
    });
  // Two pieces for the parent's row: the button sits beside the box, and the line under the whole row.
  // `className` sets the height to match the box beside it (h-12) and the offset past its label.
  return (
    <>
      <button type="button" onClick={look} disabled={pending || !reg.trim()} className={`inline-flex shrink-0 items-center justify-center gap-2 px-5 disabled:opacity-60 ${secondaryButton} ${className}`}>
        <SearchIcon className="size-5" />
        {pending ? "Looking up" : "Look up"}
      </button>
      <p role="status" aria-live="polite" className="basis-full text-meta text-text-2 empty:hidden">
        {said}
      </p>
    </>
  );
}
