"use client";

import { useSyncExternalStore } from "react";
import { ChevronDownIcon } from "@/components/stock/icons";
import { SITE_NAME } from "@/lib/site";
import { NOTE_EVENT, journeyOf, readNote, sharedLines } from "@/lib/visit-note";

const subscribe = (changed: () => void) => {
  addEventListener(NOTE_EVENT, changed);
  return () => removeEventListener(NOTE_EVENT, changed);
};

// Above the consent on an enquiry (#249): off until the buyer turns it on, and only then does the form send this visit's note. With
// nothing noted (a first page, or storage blocked) it is not shown at all. Read after mount: the server has no sessionStorage.
export function ShareVisit({ id, on, onChange }: { id: string; on: boolean; onChange(on: boolean): void }) {
  const journey = journeyOf(useSyncExternalStore(subscribe, readNote, () => null));
  if (!journey) return null;
  return (
    <div className="flex flex-col">
      {/* The whole row is the label, so the target is the full width and at least 44px tall. */}
      <label className="flex min-h-11 items-start gap-3 py-1 text-meta">
        <input id={id} type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-accent" />
        Share the cars you looked at with {SITE_NAME}, so they can help faster
      </label>
      <details className="group pl-8">
        <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 text-meta font-semibold [&::-webkit-details-marker]:hidden">
          What&apos;s shared
          <ChevronDownIcon className="size-5 text-text-2 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <ul className="flex list-disc flex-col gap-1 pb-2 pl-5 text-meta text-text-2">
          {sharedLines(journey).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
