import { AutoCarousel } from "@/components/AutoCarousel";
import Link from "next/link";
import { CheckIcon } from "@/components/stock/icons";
import { card, carSlide } from "@/components/ui";
import { ListingCard } from "@/components/stock/ListingCard";
import { featureLabel, plainText, specRows } from "@/lib/stock/format";
import { FactValue } from "@/components/stock/CarMeta";
import { UnitToggle } from "@/components/UnitToggle";
import { DEFAULT_QUERY, stockHref } from "@/lib/stock/query";
import type { Car, StockQuery } from "@/lib/stock/types";

const VISIBLE_FEATURES = 12;
const LONG_DESCRIPTION = 700; // characters; the demo's longest is 978
// wrap-anywhere: a bare web address in the dealer's text has no space to break at.
const text = "mt-4 max-w-measure whitespace-pre-line wrap-anywhere";
const h2 = "text-heading font-semibold";

// Server components. Dealer text is rendered as React text only, never as HTML (T-02-14). Each returns nothing when it has nothing to show.
export function AboutCar({ car }: { car: Car }) {
  // Feeds send HTML now and then ("<b>no accidents</b>"): it is shown as words, never as markup and never as raw tags.
  const description = plainText(car.description ?? "");
  if (!description) return null;
  return (
    <section>
      <h2 className={h2}>About this car</h2>
      {description.length > LONG_DESCRIPTION ? (
        <>
          {/* One copy of the text: the checkbox, before it, lifts the clamp (peer), so it works without JavaScript and the page holds the text once. */}
          <input type="checkbox" id={`more-${car.id}`} className="peer sr-only" />
          <p className={`${text} line-clamp-8 peer-checked:line-clamp-none`}>{description}</p>
          <label
            htmlFor={`more-${car.id}`}
            className="flex min-h-11 cursor-pointer items-center font-semibold peer-focus-visible:underline [&>span:last-child]:hidden peer-checked:[&>span:first-child]:hidden peer-checked:[&>span:last-child]:inline"
          >
            <span>Read more</span>
            <span>Show less</span>
          </label>
        </>
      ) : (
        <p className={text}>{description}</p>
      )}
    </section>
  );
}

export function Specifications({ car }: { car: Car }) {
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={h2}>Specifications</h2>
        {car.mileageKm !== undefined && <UnitToggle />}
      </div>
      {/* Every other row filled (in pairs from 640px, where two rows sit side by side), so a label is easy to follow to its value. */}
      <dl className={`mt-4 grid grid-cols-1 gap-x-4 ${card} p-2 sm:grid-cols-2`}>
        {specRows(car).map((r) => (
          <div key={r.label} className="flex justify-between gap-4 rounded-control px-3 py-2.5 even:bg-row-alt sm:even:bg-transparent sm:[&:nth-child(4n+1)]:bg-row-alt sm:[&:nth-child(4n+2)]:bg-row-alt">
            <dt className="shrink-0 text-text-2">{r.label}</dt>
            <dd className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">
              <FactValue car={car} {...r} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const List = ({ items }: { items: string[] }) => (
  <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
    {items.map((f, i) => (
      <li key={i} className="flex items-start gap-2">
        <CheckIcon className="mt-1 size-4 shrink-0" />
        <span className="min-w-0 break-words">{featureLabel(f)}</span>
      </li>
    ))}
  </ul>
);

export function Equipment({ car }: { car: Car }) {
  const all = car.features ?? [];
  if (!all.length) return null;
  const rest = all.slice(VISIBLE_FEATURES);
  return (
    <section>
      <h2 className={h2}>Equipment</h2>
      <div className="mt-4">
        <List items={all.slice(0, VISIBLE_FEATURES)} />
        {rest.length > 0 && (
          // Native <details>: works without JavaScript.
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center font-semibold [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Show all {all.length}</span>
              <span className="hidden group-open:inline">Show fewer</span>
            </summary>
            <List items={rest} />
          </details>
        )}
      </div>
    </section>
  );
}

// A used car links to the body and make pages; a new car or a van to its own list, filtered the same way.
const seeAll = (car: Car, filter: Pick<StockQuery, "body"> | Pick<StockQuery, "make">) =>
  !car.condition || car.condition === "used" ? `/used-cars/${"body" in filter ? filter.body[0] : filter.make[0]}` : stockHref({ ...DEFAULT_QUERY, ...filter, condition: car.condition });

export function SimilarCars({ car, cars }: { car: Car; cars: Car[] }) {
  if (!cars.length) return null;
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <h2 className={h2}>Similar cars</h2>
        {/* More of the same kind of car, and more of the same make. */}
        <div className="flex flex-wrap gap-x-6">
          {car.bodySlug && car.bodyType && (
            <Link href={seeAll(car, { body: [car.bodySlug] })} className="inline-flex min-h-11 items-center font-semibold underline">
              See all {car.bodyType}s
            </Link>
          )}
          <Link href={seeAll(car, { make: [car.makeSlug] })} className="inline-flex min-h-11 items-center font-semibold underline">
            See all {car.make}
          </Link>
        </div>
      </div>
      <div className="mt-4">
        <AutoCarousel label="Similar cars">
          {cars.map((c) => (
            <li key={c.id} className={carSlide}>
              <ListingCard car={c} priority={false} oneLine />
            </li>
          ))}
        </AutoCarousel>
      </div>
    </section>
  );
}
