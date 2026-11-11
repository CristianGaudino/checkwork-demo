import { priceInfo } from "@/lib/stock/price";
import type { Car } from "@/lib/stock/types";

// One price for any vehicle, everywhere: the headline, what VAT means, the drop and the finance-from figure. All words come from
// priceInfo (and pricing.config.ts). `card` sits at the card's right edge; `hero` is the car page's large price.
export function PriceBlock({ car, size = "card" }: { car: Pick<Car, "priceEur" | "wasPriceEur" | "vat" | "soldAt">; size?: "card" | "hero" }) {
  const p = priceInfo(car);
  const hero = size === "hero";
  return (
    <div data-price-block className={`flex flex-col gap-0.5 ${hero ? "items-start" : "shrink-0 @xs:items-end @xs:text-right"}`}>
      <p data-price className={`font-semibold tabular-nums ${hero ? "text-hero font-bold" : "text-heading"} ${car.soldAt ? "text-text-2" : ""}`}>
        {p.headline}
      </p>
      {p.vatLine && <p className="text-meta text-text-2">{p.vatLine}</p>}
      {p.incVat && <p className="text-meta tabular-nums text-text-2">{p.incVat}</p>}
      {/* On a card the drop is a tag on the photo (ListingCard), so the price lines up with the cards beside it. */}
      {p.drop && hero && (
        <p className="text-meta tabular-nums">
          <s className="text-text-2">{p.was}</s> <span className="font-semibold text-better">{p.drop}</span>
        </p>
      )}
      {hero && p.financeFrom && <p className="text-meta tabular-nums text-text-2">{p.financeFrom}</p>}
    </div>
  );
}
