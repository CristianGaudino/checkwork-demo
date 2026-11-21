import { Panel, adminButton } from "@/components/admin/kit";
import { ExternalIcon } from "@/components/stock/icons";
import { NEW_TAB } from "@/components/ui";
import { LISTING_SITE, DONEDEAL_DEALER_URL } from "@/lib/stock-source-rules";

// Shown where a car would be added, when the stock comes from DoneDeal: cars are added there.
export function SyncedNotice() {
  return (
    <Panel title={`This stock comes from ${LISTING_SITE}`}>
      <p className="max-w-measure text-body text-text-2">Add, edit and sell cars on {LISTING_SITE}. The site updates within 15 minutes.</p>
      <a href={DONEDEAL_DEALER_URL} {...NEW_TAB} className={`${adminButton} self-start`}>
        Open {LISTING_SITE}
        <ExternalIcon className="size-4" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </Panel>
  );
}
