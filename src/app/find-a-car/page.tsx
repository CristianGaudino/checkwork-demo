import type { Metadata } from "next";
import { DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { LeadPage } from "@/components/leads/LeadPage";
import { LeadPageForm } from "@/components/leads/LeadPageForm";
import { sourcingPrefill } from "@/lib/leads/sourcing-prefill";

export const metadata: Metadata = { title: "Find a car", description: `Can't see the car you want? Tell us what you're looking for and we'll look for it. ${SITE_NAME}, ${DEALER_LOCATION}.` };

// A make page sends ?make=audi, a search with no cars its make, model, type and budget: the form starts with them (sourcing-prefill.ts).
export default async function FindACarPage({ searchParams }: PageProps<"/find-a-car">) {
  const prefill = sourcingPrefill(await searchParams);
  return (
    <LeadPage
      title="Find a car"
      intro="Can't see the car you want in stock? Tell us what you're looking for and we'll look for it."
      how={[
        {
          title: "Tell us what you want",
          text: "The make and model if you know them, your budget, and what matters to you.",
          more: ["A make and model, or just the type of car", "Your budget, as a top figure", "Year, fuel and gearbox you prefer", "Colour, mileage or extras you must have", "Anything you want to avoid"],
        },
        { title: "We look for it", text: "We search for a car that fits what you asked for.", more: ["We use what you tell us, so the more you add, the better the match."] },
        { title: "We get in touch", text: "If we find a match, we contact you. No obligation.", more: ["We reach you by the phone number or email you give us.", "There is no obligation to buy."] },
      ]}
    >
      <LeadPageForm form="sourcing" prefill={prefill} submitLabel="Find it for me" success={{ heading: "Thanks, we'll look for it.", body: "We'll get in touch if we find a match." }} />
    </LeadPage>
  );
}
