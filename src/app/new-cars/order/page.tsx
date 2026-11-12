import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { LeadPage } from "@/components/leads/LeadPage";
import { LeadPageForm } from "@/components/leads/LeadPageForm";
import { stockSource } from "@/lib/stock-source";

export const metadata: Metadata = { title: "Order a new car", description: `Order a new car from the factory, in the spec you want, for the registration you want. ${SITE_NAME}, ${DEALER_LOCATION}.` };

// A factory order: the dealer places it and keeps the buyer posted until it arrives. A dealer whose stock is on DoneDeal has no orders
// here (our version only), so the page is not there for them.
export default async function OrderPage() {
  if ((await stockSource()) === "donedeal") notFound();
  return (
    <LeadPage
      title="Order a new car"
      intro="Can't see the spec you want in stock? We can order it from the factory for you."
      how={[
        { title: "Tell us the car", text: "The make, the model, the trim and colour, and the registration you'd like.", more: ["271 means January to June 2027, 272 July to December.", "Not sure of the trim? Tell us what matters and we'll suggest one."] },
        { title: "We confirm the order", text: "We call you with the price and a delivery date, and take a deposit to place the order." },
        { title: "We keep you posted", text: "We tell you when it is built, when it is on its way, and when it is ready to collect." },
      ]}
    >
      <LeadPageForm form="order" submitLabel="Send my order" success={{ heading: "Thanks, we have your order request.", body: "We'll call you to confirm the price and the date." }} />
    </LeadPage>
  );
}
