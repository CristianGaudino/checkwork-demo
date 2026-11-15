import { sectionTitle } from "@/components/ui";
import { DirectionsButton } from "@/components/DirectionsButton";
import { MapBox } from "@/components/MapBox";
import { OpeningHours } from "@/components/OpeningHours";
import { dealerDirectionsUrl, mapEmbedUrl } from "@/lib/dealer";
import { DEALER_ADDRESS, DEALER_ADDRESS_TEXT, SITE_NAME } from "@/lib/site";

// Where we are: the address and hours beside the map, with the way there.
export function VisitUs() {
  return (
    <section aria-labelledby="visit-us" className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 id="visit-us" className={sectionTitle}>Visit us</h2>
          <address className="text-body not-italic">{DEALER_ADDRESS_TEXT}</address>
        </div>
        <OpeningHours />
        <DirectionsButton href={dealerDirectionsUrl()} />
      </div>
      <MapBox embedUrl={mapEmbedUrl()} title={`Map of ${SITE_NAME}, ${DEALER_ADDRESS.town}`} />
    </section>
  );
}
