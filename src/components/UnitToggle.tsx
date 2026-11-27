"use client";

import { setUnit, useUnit, type Unit } from "@/lib/units";
import { press } from "@/components/ui";
import { count } from "@/lib/count-client";

// km or miles: a small two-button switch beside a mileage, for buyers who think in miles. Every mileage on the page follows it.
export function UnitToggle({ className = "" }: { className?: string }) {
  const unit = useUnit();
  return (
    <div role="group" aria-label="Mileage in" className={`inline-flex rounded-full border border-hairline bg-card p-0.5 text-meta ${className}`}>
      {(["km", "miles"] as Unit[]).map((u) => (
        <button
          key={u}
          type="button"
          aria-pressed={unit === u}
          onClick={() => (setUnit(u), count("units"))}
          className={`min-h-11 rounded-full px-3 font-medium ${unit === u ? "bg-text text-ink" : "text-text-2 hover:text-text"} ${press}`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}
