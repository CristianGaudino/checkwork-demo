"use client";

import { useState } from "react";
import { CheckIcon, SwapIcon } from "@/components/stock/icons";
import { showToast } from "@/components/toast";
import { count } from "@/lib/count-client";
import { restoreCompare, toggleCompare, useCompareIds } from "@/lib/compare/store";

// On the car page only: the cards carry just the heart, so a photo is not buried in buttons.
// The label never changes; aria-pressed carries the state, as with the heart.
export function CompareButton({ id, label }: { id: string; label: string }) {
  const ids = useCompareIds();
  const on = ids.includes(id);
  const [said, setSaid] = useState("");
  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        aria-label={label}
        onClick={() => {
          const result = toggleCompare(id);
          if (result === "added") count("compare");
          if (result === "removed") showToast("Removed from compare", () => restoreCompare([id]));
          // The toast is announced itself, so the live region below only says a car went in.
          if (result === "full") showToast("You can compare up to three cars. Remove one to add another.");
          setSaid(result === "added" ? "Added to compare" : "");
        }}
        className="inline-flex min-h-11 items-center gap-2 text-meta font-medium text-text"
      >
        {/* A quiet text action: a tick shows the car is in the list. */}
        {on ? <CheckIcon className="size-4" /> : <SwapIcon className="size-4" />}
        Compare
      </button>
      <span aria-live="polite" className="sr-only">
        {said}
      </span>
    </>
  );
}
