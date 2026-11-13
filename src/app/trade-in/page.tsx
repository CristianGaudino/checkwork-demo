import type { Metadata } from "next";
import Link from "next/link";
import { DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { LeadPage } from "@/components/leads/LeadPage";
import { LeadPageForm } from "@/components/leads/LeadPageForm";
import { PageCar } from "@/components/PageHeading";
import { showroomPhoto } from "@/lib/stock/showroom";
import { PHOTO_MIN_COUNT, PHOTO_SLOTS } from "@/lib/leads/constants";
import { stock } from "@/lib/stock";
import { carChoices } from "@/lib/stock/options";

export const metadata: Metadata = {
  title: "Trade in your car",
  description: `Trade in your car against one of ours at ${SITE_NAME} in ${DEALER_LOCATION}. Tell us about it, send some photos and we'll take the value off your next car.`,
};

// Read per request: the car list is the live stock, and ?car= picks one.
export const dynamic = "force-dynamic";

export default async function TradeInPage({ searchParams }: PageProps<"/trade-in">) {
  const { car } = await searchParams;
  const cars = await carChoices();
  // Arriving from a car page (?car=its-slug): that car is already chosen.
  const hit = typeof car === "string" && car.length < 120 ? await stock.lookup(car).catch(() => null) : null;
  const photo = await showroomPhoto(hit?.state === "live" ? hit.car : undefined);
  const chosen = hit?.state === "live" && cars.some(([id]) => id === hit.car.id) ? hit.car.id : undefined;
  return (
    <LeadPage
      title="Trade in your car"
      picture={<PageCar photo={photo} />}
      intro={
        <>
          Changing car? We value yours and take it off the price of one of ours. Just selling? <Link href="/sell-your-car" className="font-medium underline">Sell your car</Link>
        </>
      }
      how={[
        { title: "Pick the car you want", text: "Or leave it for now and we value yours first." },
        {
          title: "Tell us about yours",
          text: "Registration, mileage, condition and photos.",
          more: [`At least ${PHOTO_MIN_COUNT} photos: ${PHOTO_SLOTS.filter((s) => s !== "Any damage").join(", ")}.`, "Include photos of any damage, even small marks."],
        },
        { title: "We come back with a price", text: "Taken off the car you buy.", more: ["The valuation is an estimate until we see the car."] },
      ]}
    >
      <LeadPageForm
        form="trade"
        cars={cars}
        prefill={chosen ? { carId: chosen } : undefined}
        submitLabel="Get my valuation"
        success={{ heading: "Thanks, we have your car details.", body: "We'll contact you with a valuation. It's an estimate until we've seen the car." }}
      />
    </LeadPage>
  );
}
