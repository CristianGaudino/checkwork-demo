import Link from "next/link";
import { ShareButton } from "@/components/car/ShareButton";
import { CompareButton } from "@/components/compare/CompareButton";
import { LeadActions, StockAlertButton } from "@/components/leads/LeadDialog";
import { SaveButton } from "@/components/saved/SaveButton";
import { CalendarIcon, CarIcon, FuelIcon, GaugeIcon, GearIcon, ShieldCheckIcon, SwapIcon } from "@/components/stock/icons";
import { DEALER_WHATSAPP, NEW_CAR_WARRANTY, SITE_URL, WARRANTY } from "@/lib/site";
import { priceInfo } from "@/lib/stock/price";
import { rareMarker } from "@/lib/stock/markers";
import { CarMeta, FactValue } from "@/components/stock/CarMeta";
import { PriceBlock } from "@/components/stock/PriceBlock";
import { carName, carSummary, keyFacts, carHref } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";
import type { Car } from "@/lib/stock/types";
import { accentButton, card } from "@/components/ui";
import { IfModule } from "@/components/IfModule";

const button = `flex w-full items-center justify-center gap-2 ${accentButton}`;
const FACT_ICONS: Record<string, typeof CarIcon> = { Year: CalendarIcon, Mileage: GaugeIcon, Fuel: FuelIcon, Transmission: GearIcon };

// Server component. A sold car shows no price and no Call Us, and never its sale date (owner instruction, 2026-11-06). A reserved car keeps
// its price, and offers what a sold one does: more of the make, and a note if it comes back on sale.
// Laid out as the mockup's car page: the title and a heart, the details line, the price, the buttons, four facts, the warranty.
export function BuyBox({ car }: { car: Car }) {
  const sold = isSold(car);
  const price = priceInfo(car);
  const warranty = car.condition === "new" ? NEW_CAR_WARRANTY : WARRANTY;
  const marker = rareMarker(car);
  const url = `${SITE_URL}${carHref(car.slug)}`;
  const whatsapp = `${DEALER_WHATSAPP}?text=${encodeURIComponent(`Hi, I'm interested in the ${carName(car)}: ${url}`)}`;
  return (
    <div data-testid="buy-box" className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        {/* Make and model large, the variant under it: a 60 character variant would otherwise fill a phone screen. The text reads as carTitle. */}
        {/* A long make and model (a 40 character van name) steps down a size on a phone, so no word is split in the middle. */}
        <h1 className={`min-w-0 break-words font-bold ${`${car.make} ${car.model}`.length > 24 ? "text-heading sm:text-display" : "text-display"}`}>
          {car.make} {car.model}
          {car.variant && (
            <>
              {" "}
              <span className="mt-1 block text-heading font-semibold text-text-2">{car.variant}</span>
            </>
          )}
        </h1>
        {/* Share beside the heart, where a buyer looks for them. */}
        <div className="flex shrink-0 items-center">
          <ShareButton iconOnly title={carName(car)} text={sold ? carName(car) : `${carName(car)}, ${[price.headline, price.vatLine].filter(Boolean).join(" ")}`} url={url} />
          <SaveButton id={car.id} label="Save this car" variant="page" />
        </div>
      </div>
      <p className="-mt-3 text-body text-text-2">
        <CarMeta car={car} />
      </p>
      {marker && <span className="-mt-2 inline-flex h-7 w-fit items-center rounded-full bg-info-soft px-3 text-meta font-medium text-info">{marker}</span>}
      {!sold && <PriceBlock car={car} size="hero" />}
      {/* Reserved in Phase 2 for the lead buttons: so adding rows moves nothing below. */}
      <div data-testid="action-area" className="flex flex-col gap-3">
        {sold || car.reserved ? (
          <div className={`flex flex-col gap-2 ${card} p-4`}>
            <p className="text-heading font-semibold">{sold ? "Sold" : "Reserved"}</p>
            <p className="text-meta text-text-2">{sold ? "This car is no longer for sale." : "A deposit has been paid on this car. If it comes back on sale, we can let you know."}</p>
            <Link href={`/makes/${car.makeSlug}`} className={button}>
              See more {car.make}
            </Link>
            <StockAlertButton car={carSummary(car)} kind="back-in-stock" />
          </div>
        ) : (
          <LeadActions car={carSummary(car)} whatsapp={whatsapp} />
        )}
      </div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-hairline bg-hairline lg:grid-cols-4">
        {keyFacts(car).map((f) => {
          const Icon = FACT_ICONS[f.label] ?? CarIcon;
          return (
            <div key={f.label} className="flex min-w-0 flex-col items-center gap-1 bg-card px-2 py-4 text-center">
              <Icon className="size-6" />
              {/* Label first in the source, as a list needs; the value shows above it. */}
              <dt className="order-3 text-meta text-text-2">{f.label}</dt>
              <dd className="order-2 break-words text-meta font-semibold [overflow-wrap:anywhere] sm:whitespace-nowrap">
                <FactValue car={car} {...f} />
              </dd>
            </div>
          );
        })}
      </dl>
      {/* Under the facts, side by side like Call us and WhatsApp, so the buttons and facts stay in view on a phone. */}
      {!sold && (
        <div className="grid grid-cols-2 gap-2">
          {/* A reserved car can still be compared; a price alert or a trade-in against it would go nowhere (its panel offers Notify me). */}
          <div className={car.reserved ? "col-span-2" : undefined}>
            <CompareButton id={car.id} label={`Compare ${carName(car)}`} sizing="flex h-12 w-full px-4" />
          </div>
          {!car.reserved && (
            <>
              <StockAlertButton car={carSummary(car)} kind="price-drop" />
              {/* The trade-in door with this car already chosen. */}
              <IfModule href="/trade-in">
              <Link href={`/trade-in?car=${car.slug}`} className="inline-flex min-h-11 items-center gap-2 text-meta font-medium text-accent-text underline col-span-2">
                <SwapIcon className="size-4" />
                Trade in your car against this one
              </Link>
              </IfModule>
            </>
          )}
        </div>
      )}
      {!sold && (
        <div className={`flex items-start gap-3 ${card} p-4`}>
          <ShieldCheckIcon className="mt-0.5 size-8 shrink-0 text-accent-text" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-body font-semibold">{warranty.title} included</p>
            <p className="text-meta text-text-2">{warranty.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
