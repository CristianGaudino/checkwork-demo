import Link from "next/link";
import { Fragment } from "react";
import { ShareButton } from "@/components/car/ShareButton";
import { CompareButton } from "@/components/compare/CompareButton";
import { LeadActions, StockAlertButton } from "@/components/leads/LeadDialog";
import { SaveButton } from "@/components/saved/SaveButton";
import { ShieldCheckIcon, SwapIcon } from "@/components/stock/icons";
import { DEALER_WHATSAPP, NEW_CAR_WARRANTY, SITE_URL, WARRANTY } from "@/lib/site";
import { priceInfo } from "@/lib/stock/price";
import { rareMarker } from "@/lib/stock/markers";
import { CarMeta } from "@/components/stock/CarMeta";
import { PriceBlock } from "@/components/stock/PriceBlock";
import { carName, carSummary, carHref } from "@/lib/stock/format";
import { isNew, isSold, onRequest } from "@/lib/stock/types";
import type { Car } from "@/lib/stock/types";
import { accentButton, card } from "@/components/ui";
import { longTitle } from "./title";

const button = `flex w-full items-center justify-center gap-2 ${accentButton}`;

// Server component. A sold car shows no price and no Call Us, and never its sale date (owner instruction, 2026-11-06). A reserved car keeps
// its price, and offers what a sold one does: more of the make, and a note if it comes back on sale.
// Laid out as the mockup's car page: the title and a heart, the details line, the price, the buttons, the warranty.
export function BuyBox({ car }: { car: Car }) {
  const sold = isSold(car);
  const price = priceInfo(car);
  const warranty = isNew(car) ? NEW_CAR_WARRANTY : WARRANTY;
  const marker = rareMarker(car);
  const url = `${SITE_URL}${carHref(car.slug)}`;
  const whatsapp = `${DEALER_WHATSAPP}?text=${encodeURIComponent(`Hi, I'm interested in the ${carName(car)}: ${url}`)}`;
  return (
    <div data-testid="buy-box" className="flex flex-col gap-5">
      {/* The name first in the source, so a screen reader reaches it before Share and Save. Below 640px the icons sit at the top right and
          an empty float the size of the two buttons makes the title wrap under them; from 640px they sit beside it. */}
      <div className="relative sm:flex sm:items-start sm:justify-between sm:gap-3">
        {/* Make and model large, the variant under it: a 60 character variant would otherwise fill a phone screen. The text reads as carTitle. */}
        {/* Each word of the name is one box: beside the float a word that does not fit moves below the icons whole, and only a word wider than
            the whole column breaks inside (break-words on the h1 split "Mercedes-Benz" beside the float). Balance off on a phone: Chrome balances
            the lines over the float. */}
        <h1 className={`min-w-0 font-bold max-sm:text-wrap max-sm:before:float-right max-sm:before:ml-3 max-sm:before:h-11 max-sm:before:w-22 max-sm:before:content-[''] ${longTitle(car) ? "text-heading sm:text-display" : "text-display"}`}>
          {`${car.make} ${car.model}`.split(" ").map((word, i) => (
            <Fragment key={i}>
              {i > 0 && " "}
              <span className="inline-block max-w-full break-words">{word}</span>
            </Fragment>
          ))}
          {car.variant && (
            <>
              {" "}
              <span className="mt-1 block break-words text-heading font-semibold text-text-2">{car.variant}</span>
            </>
          )}
        </h1>
        {/* Share beside the heart, where a buyer looks for them. */}
        <div className="absolute right-0 top-0 flex items-center sm:static sm:shrink-0">
          <ShareButton iconOnly title={carName(car)} text={sold ? carName(car) : `${carName(car)}, ${[price.headline, price.vatLine].filter(Boolean).join(" ")}`} url={url} />
          <SaveButton id={car.id} label="Save this car" variant="page" />
        </div>
      </div>
      <p data-meta className="-mt-3 text-body text-text-2">
        <CarMeta car={car} />
      </p>
      {marker && <span className="-mt-2 inline-flex h-7 w-fit items-center rounded-full bg-info-soft px-3 text-meta font-medium text-info">{marker}</span>}
      {!sold && <PriceBlock car={car} size="hero" />}
      {/* Reserved in Phase 2 for the lead buttons: so adding rows moves nothing below. */}
      <div data-testid="action-area" className="flex flex-col gap-3">
        {sold || car.reserved ? (
          <div className={`flex flex-col gap-2 ${card} p-4`}>
            <p className="text-heading font-semibold">{sold ? "Sold" : "Reserved"}</p>
            <p className="text-meta text-text-2">
              {sold ? "This car is no longer for sale." : "A deposit has been paid on this car."}
              {!sold && " If it comes back on sale, we can let you know."}
            </p>
            <Link href={`/makes/${car.makeSlug}`} className={button}>
              See more {car.make}
            </Link>
            <StockAlertButton car={carSummary(car)} kind="back-in-stock" />
          </div>
        ) : (
          <LeadActions car={carSummary(car)} whatsapp={whatsapp} />
        )}
      </div>
      {/* Quiet text actions under the buttons: Compare and Price alert on one row, the trade-in under them. */}
      {!sold && (
        <div className="-mt-2 flex flex-col">
          {/* A reserved car can still be compared; a price alert or a trade-in against it would go nowhere (its panel offers Notify me). */}
          <div className="flex flex-wrap gap-x-6">
            <CompareButton id={car.id} label={`Compare ${carName(car)}`} />
            {!car.reserved && !onRequest(car) && <StockAlertButton car={carSummary(car)} kind="price-drop" />}
          </div>
          {!car.reserved && (
            // The trade-in door with this car already chosen.
            <Link href={`/trade-in?car=${car.slug}`} className="inline-flex min-h-11 w-fit items-center gap-2 text-meta font-medium text-accent-text underline">
              <SwapIcon className="size-4" />
              Trade in your car against this one
            </Link>
          )}
        </div>
      )}
      {!sold && (
        <div className={`flex items-start gap-3 ${card} p-4`}>
          <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-text-2" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-body font-semibold">{warranty.title} included</p>
            <p className="text-meta text-text-2">{warranty.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
