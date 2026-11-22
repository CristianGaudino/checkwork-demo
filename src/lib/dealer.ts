import type { Reviews } from "@/lib/reviews";
import { AFFILIATIONS, affiliationsOf, type Affiliation } from "@/lib/affiliations";
import { clock12 } from "@/lib/format";
import { DEALER_ADDRESS, DEALER_FACTS_CONFIRMED, DEALER_TEL, OPENING_HOURS, SITE_NAME, SITE_URL } from "@/lib/site";


export const formatHours = ({ opens, closes }: { opens?: string; closes?: string }) => (opens && closes ? `${clock12(opens)} to ${clock12(closes)}` : "Closed");

// Consecutive days with the same hours become one row: "Monday to Friday 9:30am to 6pm".
export function groupHours(days: typeof OPENING_HOURS = OPENING_HOURS): { label: string; hours: string }[] {
  const rows: { first: string; last: string; hours: string }[] = [];
  for (const d of days) {
    const hours = formatHours(d);
    const prev = rows.at(-1);
    if (prev?.hours === hours) prev.last = d.day;
    else rows.push({ first: d.day, last: d.day, hours });
  }
  return rows.map((r) => ({ label: r.first === r.last ? r.first : `${r.first} to ${r.last}`, hours: r.hours }));
}

// The eircode pins the exact spot; the town alone does not.
// The street, not the eircode: the eircode here is illustrative, the street is real.
export const mapQuery = () => `${DEALER_ADDRESS.street}, ${DEALER_ADDRESS.town}, Ireland`;

export const directionsUrl = (placeId?: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery())}${placeId ? `&query_place_id=${encodeURIComponent(placeId)}` : ""}`;

export const mapEmbedUrl = () => `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery())}&output=embed`;

// schema.org AutoDealer (D-07). Street, postcode and hours only once confirmed; a rating only from real Google reviews.
// No geo, priceRange, sameAs, review or areaServed: there are no confirmed facts for them.
export function dealerJsonLd(reviews: Reviews | null, confirmed = DEALER_FACTS_CONFIRMED, affiliations: readonly Affiliation[] = AFFILIATIONS): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    "@id": `${SITE_URL}/#dealer`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logo.png`,
    image: `${SITE_URL}/brand/logo.png`,
    telephone: DEALER_TEL,
    address: {
      "@type": "PostalAddress",
      ...(confirmed && { streetAddress: DEALER_ADDRESS.street }),
      addressLocality: DEALER_ADDRESS.town,
      addressRegion: DEALER_ADDRESS.county,
      ...(confirmed && { postalCode: DEALER_ADDRESS.eircode }),
      addressCountry: "IE",
    },
  };
  if (confirmed) {
    data.openingHoursSpecification = OPENING_HOURS.filter((h) => h.opens && h.closes).map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.day,
      opens: h.opens,
      closes: h.closes,
    }));
  }
  // Valid markup, but Google shows no stars for a business's own reviews; kept for completeness (UI-SPEC).
  if (reviews?.source === "google" && reviews.rating !== undefined && reviews.count !== undefined) {
    data.aggregateRating = { "@type": "AggregateRating", ratingValue: reviews.rating, reviewCount: reviews.count };
  }
  // The bodies the dealer is a member of (src/lib/affiliations.ts), none on the demo.
  const members = affiliationsOf(["membership"], affiliations);
  if (members.length) data.memberOf = members.map((a) => ({ "@type": "Organization", name: a.name, ...(a.href && { url: a.href }) }));
  return data;
}

// Directions to the dealer, by Google place when its ID is set and by the address otherwise.
export const dealerDirectionsUrl = () => directionsUrl(process.env.GOOGLE_PLACE_ID);
