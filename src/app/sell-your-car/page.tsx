import type { Metadata } from "next";
import Link from "next/link";
import { DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { LeadPage } from "@/components/leads/LeadPage";
import { LeadPageForm } from "@/components/leads/LeadPageForm";
import { PHOTO_MIN_COUNT, PHOTO_NOTES } from "@/lib/leads/constants";
import { carChoices } from "@/lib/stock/options";

export const metadata: Metadata = {
  title: "Sell your car",
  description: `Sell your car to ${SITE_NAME} in ${DEALER_LOCATION}. No need to buy from us. Tell us about it, send photos and we'll come back with an offer.`,
};

export const dynamic = "force-dynamic";

export default async function SellYourCarPage() {
  const cars = await carChoices();
  return (
    <LeadPage
      title="Sell your car"
      intro={
        <>
          We buy good cars, and you don&apos;t need to buy one from us. Changing car? <Link href="/trade-in" className="font-medium underline">Trade it in</Link> and we can usually offer more.
        </>
      }
      how={[
        { title: "Tell us about your car", text: "Registration, mileage and condition." },
        {
          title: "Send photos",
          text: `At least ${PHOTO_MIN_COUNT} clear photos, including any damage.`,
          more: PHOTO_NOTES,
        },
        { title: "We make you an offer", text: "We call or email with a price.", more: ["The offer is an estimate until we see the car.", "We pay by bank transfer when we collect it."] },
      ]}
    >
      <LeadPageForm
        form="sell"
        cars={cars}
        submitLabel="Get my offer"
        success={{ heading: "Thanks, we have your car details.", body: "We'll contact you with an offer. It's an estimate until we've seen the car." }}
      />
    </LeadPage>
  );
}
