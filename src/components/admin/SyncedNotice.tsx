import { Panel, adminButton } from "@/components/admin/kit";
import { ExternalIcon } from "@/components/stock/icons";
import { NEW_TAB } from "@/components/ui";
import { LISTING_SITE, DONEDEAL_DEALER_URL, listingHref } from "@/lib/stock-source-rules";

// Shown where a car would be added or edited, when the stock comes from DoneDeal. With a car, the button opens that car's own ad.
export function SyncedNotice({ car }: { car?: { listingUrl?: string } }) {
  return (
    <Panel title={`This stock comes from ${LISTING_SITE}`}>
      <p className="max-w-measure text-body text-text-2">Add, edit and sell cars on {LISTING_SITE}. The site updates within 15 minutes.</p>
      <a href={car ? listingHref(car) : DONEDEAL_DEALER_URL} {...NEW_TAB} className={`${adminButton} self-start`}>
        {car ? `Edit on ${LISTING_SITE}` : `Open ${LISTING_SITE}`}
        <ExternalIcon className="size-4" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </Panel>
  );
}
