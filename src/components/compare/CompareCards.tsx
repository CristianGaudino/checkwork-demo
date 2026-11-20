"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { PhotoCarousel } from "@/components/stock/PhotoCarousel";
import { SkeletonCards } from "@/components/stock/SkeletonCards";
import { EmptyCars, StockError } from "@/components/stock/StockError";
import { CloseIcon, PlusIcon } from "@/components/stock/icons";
import { useCarsByIds } from "@/components/stock/useCarsByIds";
import { showToast } from "@/components/toast";
import { card, glass, secondaryButton } from "@/components/ui";
import { MAX_COMPARE, clearCompare, removeCompare, restoreCompare, useCompareIds } from "@/lib/compare/store";
import { rank } from "@/lib/compare/rank";
import type { Mark } from "@/lib/compare/rank";
import { financeMonthlyEur, payableEur, priceInfo } from "@/lib/stock/price";
import { carTitle, featureLabel, fmtEur, specRows, carHref } from "@/lib/stock/format";
import { PRICING } from "@/lib/stock/pricing.config";
import { FINANCE } from "@/lib/finance/finance.config";
import { useModules } from "@/lib/demo-role";
import { Mileage } from "@/components/Mileage";
import { UnitToggle } from "@/components/UnitToggle";
import { isSold, onRequest } from "@/lib/stock/types";
import type { Car } from "@/lib/stock/types";
import { COMPARE_CLEARED } from "@/lib/copy";

const never = () => () => {};

// What the cards compare. `better` is which end is good news for a buyer; with none (the engine) the marks are only higher and lower.
type Row = { label: string; number?: (c: Car) => number | undefined; text: (c: Car) => React.ReactNode | undefined; better?: "low" | "high" };
const spec = (label: string) => (c: Car) => specRows(c).find((r) => r.label === label)?.value;
export const ROWS: Row[] = [
  { label: "Price", number: (c) => (isSold(c) || onRequest(c) ? undefined : payableEur(c)), text: (c) => {
      const p = priceInfo(c);
      // Ranked on what the buyer pays, so an ex. VAT price shows that figure too.
      return p.incVat ? <span className="flex flex-col items-end">{p.headline}<span className="text-meta font-normal text-text-2">{p.incVat}</span></span> : p.headline;
    }, better: "low" },
  // The car page's own estimate (the calculator's defaults), with the lender's wording under the cards. Only with the finance module on.
  { label: "Finance", number: financeMonthlyEur, text: (c) => { const m = financeMonthlyEur(c); return m === undefined ? undefined : `${fmtEur(m)} ${PRICING.labels.perMonth}`; }, better: "low" },
  { label: "Year", number: (c) => c.year, text: (c) => String(c.year), better: "high" },
  { label: "Mileage", number: (c) => c.mileageKm, text: (c) => (c.mileageKm === undefined ? undefined : <Mileage km={c.mileageKm} />), better: "low" },
  { label: "Fuel", text: spec("Fuel") },
  { label: "Transmission", text: spec("Transmission") },
  { label: "Engine", number: (c) => c.engineLitres, text: spec("Engine") },
  { label: "Body type", text: spec("Body type") },
  // "2027-07" as 202707, so a later NCT ranks higher. Only a month the spec rows accept.
  { label: "NCT expires", number: (c) => (spec("NCT expires")(c) ? Number(c.nctExpiry!.replace("-", "")) : undefined), text: spec("NCT expires"), better: "high" },
  { label: "Equipment", number: (c) => c.features?.length, text: (c) => (c.features?.length ? `${c.features.length} items` : undefined), better: "high" },
];

// A symbol and a colour, nothing to read: up for the higher, down for the lower, a dash for the one between (three cars). The word is
// there for screen readers, and the colour is only ever a second sign.
function Marker({ mark, better, of }: { mark: Mark; better?: "low" | "high"; of: number }) {
  if (!mark) return null;
  const word = mark === "mid" ? "Middle" : `${mark === "low" ? "Low" : "High"}${of > 2 ? "est" : "er"}`;
  const tone = !better || mark === "mid" ? "bg-hairline text-text-2" : mark === better ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad";
  return (
    <span className={`inline-flex size-6 items-center justify-center rounded-full text-meta font-semibold ${tone}`}>
      <span aria-hidden="true">{mark === "low" ? "▼" : mark === "high" ? "▲" : "-"}</span>
      <span className="sr-only">{word}</span>
    </span>
  );
}

// km or miles, only once there is a mileage to show it on.
export function CompareUnitToggle() {
  return useCompareIds().length > 0 ? <UnitToggle className="self-start" /> : null;
}

const Empty = () => <EmptyCars title="Nothing to compare yet" text="Open a car and tap Compare. You can compare up to three." />;

// The empty place next to the cars picked so far: the whole card is the way to add the next one.
function Placeholder() {
  return (
    <Link
      href="/used-cars"
      data-testid="compare-placeholder"
      className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-hairline p-6 text-center transition-colors hover:border-text hover:bg-card md:row-span-4"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-card">
        <PlusIcon className="size-6" />
      </span>
      <span className="text-body font-semibold">Add a car</span>
    </Link>
  );
}

// The ids live in this browser, so the cars come from /api/saved-cars. The list is read once on arrival; removing a car here drops
// its card straight away and does not fetch again.
export function CompareCards() {
  const live = useCompareIds();
  const finance = useModules().has("finance");
  const rows = finance ? ROWS : ROWS.filter((r) => r.label !== "Finance");
  // False on the server and during hydration, when the list still reads as the server's empty one.
  const read = useSyncExternalStore(never, () => true, () => false);
  const [ids, setIds] = useState<string[] | null>(null);
  if (read && ids === null) setIds(live); // adjusting state during render, not an effect
  const { loaded, retry } = useCarsByIds(ids, removeCompare, true);

  if (ids?.length === 0 || (ids && live.length === 0)) return <Empty />;
  if (loaded === "error") return <StockError retry={retry} />;
  if (!loaded) {
    return (
      <div aria-hidden className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SkeletonCards count={ids ? Math.min(ids.length, MAX_COMPARE) : 1} />
      </div>
    );
  }
  const cars = live.flatMap((id) => loaded.cars.filter((c) => c.id === id));
  if (cars.length === 0) return <Empty />;

  const ranks = rows.map((row) => (row.number ? rank(cars.map(row.number)) : []));

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-meta text-text-2">
          {cars.length} of {MAX_COMPARE} cars
        </p>
        <button
          type="button"
          onClick={() => {
            clearCompare();
            showToast(COMPARE_CLEARED, () => restoreCompare(live));
          }}
          className={`h-11 px-4 text-meta ${secondaryButton}`}
        >
          Clear all
        </button>
      </div>
      {loaded.gone > 0 && <p className="mb-4 text-meta text-text-2">A car you picked is no longer for sale, so it was removed.</p>}
      {/* From md each card is four rows (photo, title, figures, equipment) of a shared grid, so a title that wraps pushes the figures of every card down. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cars.map((car, ci) => (
          <article key={car.id} data-testid="compare-card" aria-label={carTitle(car)} className={`group flex flex-col overflow-hidden ${card} md:row-span-4 md:grid md:grid-rows-subgrid`}>
            <div className="relative aspect-photo bg-photo-bg">
              {/* The same swipeable photos as a stock card, so cars compare by look as well as by figures. */}
              <PhotoCarousel photos={car.photos} href={carHref(car.slug)} label={carTitle(car)} priority={false} />
              <button
                type="button"
                aria-label={`Remove ${carTitle(car)}`}
                onClick={() => {
                  removeCompare([car.id]);
                  showToast(`Removed ${car.make} ${car.model}`, () => restoreCompare([car.id]));
                }}
                className={`absolute right-2 top-2 z-20 flex size-11 items-center justify-center ${glass}`}
              >
                <CloseIcon className="size-5" />
              </button>
            </div>
            <div className="flex flex-col gap-0.5 p-4 pb-2">
              <p className="text-meta text-text-2">{car.make}</p>
              <h2 className="text-body font-semibold">
                <Link href={carHref(car.slug)} className="hover:underline">
                  {[car.model, car.variant].filter(Boolean).join(" ")}
                </Link>
              </h2>
            </div>
            <dl className="flex flex-col divide-y divide-hairline px-4 pb-2">
              {rows.map((row, ri) => (
                <div key={row.label} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3">
                  <dt className="text-meta text-text-2">{row.label}</dt>
                  <dd className="flex flex-wrap items-center justify-end gap-2 text-right">
                    <span className="text-body font-semibold tabular-nums">{row.text(car) ?? "-"}</span>
                    <Marker mark={ranks[ri][ci]} better={row.better} of={cars.length} />
                  </dd>
                </div>
              ))}
            </dl>
            {/* The list itself, folded away so the figures stay side by side on a phone. Native <details>: works without JavaScript. */}
            {car.features?.length ? (
              <details className="group border-t border-hairline px-4">
                <summary className="flex min-h-11 cursor-pointer list-none items-center text-meta font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Show equipment</span>
                  <span className="hidden group-open:inline">Hide equipment</span>
                </summary>
                <ul className="flex flex-col gap-1 pb-4 text-meta">
                  {car.features.map((f, i) => <li key={i}>{featureLabel(f)}</li>)}
                </ul>
              </details>
            ) : <div />}
          </article>
        ))}
        {cars.length < MAX_COMPARE && <Placeholder />}
      </div>
      {finance && cars.some((c) => financeMonthlyEur(c) !== undefined) && <p className="mt-6 max-w-measure text-meta text-text-2">{FINANCE.notice}</p>}
    </>
  );
}
