import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { PageHeading } from "@/components/PageHeading";
import { ReviewsStrip } from "@/components/reviews/ReviewsStrip";
import { NEW_TAB, pageMain } from "@/components/ui";

// A link inside a sentence: underlined, no taller than the line.
const inline = "font-medium underline underline-offset-2";
import { getReviews } from "@/lib/reviews";
import { DEALER_ADDRESS_LINES, DEALER_LOCATION, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Reviews", description: `What customers say about ${SITE_NAME} in ${DEALER_LOCATION}, from Google Maps.` };

// The reviews Google shows first for the dealer, as Google gives them (its Places API returns up to five, by relevance), with the rating
// and the way to every review on Google Maps. None are chosen or hidden by us (owner's decision, 2026-11-11): selecting reviews would
// mislead, and Irish consumer law asks traders to be open about how reviews are shown.
const MAPS = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([SITE_NAME, ...DEALER_ADDRESS_LINES].join(", "))}`;

export default async function ReviewsPage() {
  // Env decides the reviews provider at request time, as on the home page. Not force-dynamic: that would turn off the fetch cache.
  await connection();
  const reviews = await getReviews().catch(() => null);
  return (
    <main className={pageMain}>
      <PageHeading title="Reviews" />
      <div className="mt-6">
        {reviews?.reviews.length ? (
          <ReviewsStrip data={reviews} grid />
        ) : (
          <p className="max-w-measure text-body">
            Read what customers say about us{" "}
            <a href={MAPS} {...NEW_TAB} className={inline}>
              on Google Maps
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            .
          </p>
        )}
      </div>
      <p className="mt-10 max-w-measure text-body text-text-2">
        Bought from us? We would like to hear how it went.{" "}
        <a href={MAPS} {...NEW_TAB} className={inline}>
          Leave a review on Google Maps
          <span className="sr-only"> (opens in a new tab)</span>
        </a>{" "}
        or <Link href="/contact" className={inline}>get in touch</Link>.
      </p>
    </main>
  );
}
