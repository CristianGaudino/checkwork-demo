"use client";

import Link from "next/link";
import { useDemoRole, useStockSource } from "@/lib/demo-role";
import { ExternalIcon, PencilIcon, ShareIcon } from "@/components/stock/icons";
import { NEW_TAB, secondaryButton } from "@/components/ui";
import { LISTING_SITE, listingHref } from "@/lib/stock-source-rules";

const pill = `inline-flex min-h-11 flex-1 items-center justify-center gap-2 px-4 text-meta sm:flex-none ${secondaryButton}`;

// On a car page, for the dealer's staff: a labelled strip across the top, so it is clear these are the dealer's tools. Edit goes to this
// car's stock record; Post to social to a post for it (not for a sold car: posts are for cars in stock).
export function CarControls({ id, slug, sold = false, listingUrl }: { id: string; slug: string; sold?: boolean; listingUrl?: string }) {
  const role = useDemoRole();
  const synced = useStockSource() === "donedeal"; // synced stock is edited on DoneDeal
  if (role === "customer") return null;
  return (
    <div data-car-controls role="group" aria-label="Dealer tools" className="mt-6 flex flex-wrap items-center gap-2 rounded-card border border-hairline bg-surface p-3 sm:p-2 sm:pl-4">
      <span className="basis-full text-meta font-medium text-text-2 sm:mr-auto sm:basis-auto">Dealer</span>
      {synced ? (
        <a href={listingHref({ listingUrl })} {...NEW_TAB} className={pill}>
          <ExternalIcon className="size-4" />
          Edit on {LISTING_SITE}<span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <Link href={`/dashboard/stock/${id}`} className={pill}>
          <PencilIcon className="size-4" />
          Edit car
        </Link>
      )}
      {!sold && (
        <Link href={`/dashboard/marketing/new?car=${encodeURIComponent(slug)}`} className={pill}>
          <ShareIcon className="size-4" />
          Post to social
        </Link>
      )}
    </div>
  );
}
