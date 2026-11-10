import { MakeLogo } from "@/components/MakeLogo";
import { SaveButton } from "@/components/saved/SaveButton";
import { PhotoCarousel } from "@/components/stock/PhotoCarousel";
import { SoldBadge } from "@/components/stock/SoldBadge";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/stock/icons";
import { PriceBlock } from "@/components/stock/PriceBlock";
import { carMeta, carName, keyFacts } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";
import type { Car } from "@/lib/stock/types";

// `oneLine`: the name on one line, cut with an ellipsis (the full name shows on hover and a tap opens the car). For rows of cards, such as
// the featured cars, where a two line name would make the cards uneven.
export function ListingCard({ car, priority, oneLine = false }: { car: Car; priority: boolean; oneLine?: boolean }) {
  const href = `/used-cars/${car.slug}`;
  return (
    // The photo is the card: it carries the rounded corners and the lift, and the words sit under it on the page itself.
    <article data-card className="@container group relative scroll-mt-20 transition-opacity duration-100 has-[h2_a:active]:opacity-80">
      <div data-card-photo className="relative z-10 aspect-photo overflow-hidden rounded-tile bg-photo-bg shadow-panel [transition:box-shadow_200ms_ease-out,translate_200ms_ease-out] [@media(hover:hover)]:group-hover:-translate-y-0.5 [@media(hover:hover)]:group-hover:shadow-lift">
        <PhotoCarousel photos={car.photos} href={href} label={carName(car)} priority={priority} />
        {/* The word in the price slot is what screen readers hear; this badge is the same word for the eye. */}
        {isSold(car) && <SoldBadge hidden className="absolute left-4 top-4 z-20" />}
        {/* z-20 and outside the title link: above the carousel and never a card tap. Sold cars keep it. */}
        <SaveButton id={car.id} label={`Save ${carName(car)}`} variant="card" />
      </div>
      <div data-card-body className="flex flex-col gap-2 px-1 pb-1 pt-3">
        {/* Narrow cards (the desktop stock grid) stack the price under the name, so a long name keeps the full width. */}
        <div className="flex flex-col gap-1 @xs:flex-row @xs:items-start @xs:justify-between @xs:gap-3">
          {/* The make above the model, as in the mockup; both are inside the one link, so its name is still "Make Model Variant". */}
          <h2 className="min-w-0 text-body font-semibold">
            <Link href={href} title={oneLine ? carName(car) : undefined} className="after:absolute after:inset-0">
              <span className="flex items-center gap-1.5 text-meta font-normal text-text-2">
                <MakeLogo slug={car.makeSlug} className="size-4" />
                {car.make}
              </span>
              <span data-title className={`${oneLine ? "truncate" : "line-clamp-2"} block`}>{[car.model, car.variant].filter(Boolean).join(" ")}</span>
            </Link>
          </h2>
          <PriceBlock car={car} />
        </div>
        <p data-meta className="line-clamp-2 text-meta text-text-2">{carMeta(car)}</p>
        {/* Only in the list view (see globals.css): the key facts as chips, and the way on. */}
        <div data-list-only className="hidden flex-col gap-4">
          <ul className="flex flex-wrap gap-2">
            {keyFacts(car).map((f) => (
              <li key={f.label} className="rounded-full border border-hairline bg-surface px-3 py-1 text-meta">
                {f.value}
              </li>
            ))}
          </ul>
          <span aria-hidden="true" className="inline-flex items-center gap-2 text-meta font-semibold text-accent">
            View Car
            <ArrowRightIcon className="size-4" />
          </span>
        </div>
      </div>
    </article>
  );
}
