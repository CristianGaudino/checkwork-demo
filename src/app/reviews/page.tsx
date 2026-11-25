import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { ReviewsStrip } from "@/components/reviews/ReviewsStrip";
import { NEW_TAB, pageMain, pageTitle } from "@/components/ui";

// A link inside a sentence: underlined, no taller than the line.
const inline = "font-medium underline underline-offset-2";
import { getReviews } from "@/lib/reviews";
import { dealerDirectionsUrl } from "@/lib/dealer";
import { DEALER_LOCATION, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Reviews", description: `What customers say about ${SITE_NAME} in ${DEALER_LOCATION}, from Google Maps.` };

// The reviews Google shows first for the dealer, as Google gives them (its Places API returns up to five, by relevance), with the rating
// and the way to every review on Google Maps. None are chosen or hidden by us (owner's decision, 2026-11-11): selecting reviews would
// mislead, and Irish consumer law asks traders to be open about how reviews are shown.

export default async function ReviewsPage() {
  // Env decides the reviews provider at request time, as on the home page. Not force-dynamic: that would turn off the fetch cache.
  await connection();
  const reviews = await getReviews().catch(() => null);
  // The dealer on Google Maps: its listing when Google gave one, else its place or address, as Get directions finds it.
  const maps = reviews?.placeUri ?? dealerDirectionsUrl();
  return (
    <main className={pageMain}>
      {/* The page's own h1, not PageHeading's, so the reviews section can be labelled by it rather than by a second title. */}
      <h1 id="reviews-title" className={pageTitle}>
        Reviews
      </h1>
      <div className="mt-6">
        {reviews?.reviews.length ? (
          <ReviewsStrip data={reviews} grid labelledBy="reviews-title" />
        ) : (
          <p className="max-w-measure text-body">
            Read what customers say about us{" "}
            <a href={maps} {...NEW_TAB} className={inline}>
              on Google Maps
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            .
          </p>
        )}
      </div>
      <p className="mt-10 max-w-measure text-body text-text-2">
        Bought from us? We would like to hear how it went.{" "}
        <a href={maps} {...NEW_TAB} className={inline}>
          Leave a review on Google Maps
          <span className="sr-only"> (opens in a new tab)</span>
        </a>{" "}
        or <Link href="/contact" className={inline}>get in touch</Link>.
      </p>
    </main>
  );
}
