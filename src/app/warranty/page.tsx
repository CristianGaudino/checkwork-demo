import type { Metadata } from "next";
import { FeatureCard } from "@/components/Feature";
import { CallButton, InfoSection } from "@/components/InfoPage";
import { LayersIcon, ShieldCheckIcon } from "@/components/stock/icons";
import { card, pageMain, secondaryButton, subTitle } from "@/components/ui";
import { LeadPageForm } from "@/components/leads/LeadPageForm";
import { CLAIM_SENT } from "@/lib/leads/constants";
import { DEALER_LOCATION, DEALER_PHONE, SITE_NAME, WARRANTY } from "@/lib/site";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = { title: "Warranty", description: `The warranty that comes with a used car from ${SITE_NAME} in ${DEALER_LOCATION}, and the longer cover you can add.` };

// Generic terms until the dealer confirms the warranty (DEALER_FACTS_CONFIRMED).
export default function WarrantyPage() {
  return (
    <main className={pageMain}>
      {/* Laid out like the Service page: from 1024px the call button sits on the right, level with the title. */}
      <PageHeading title="Warranty" intro="Every car comes with cover, and you can add more." actions={
          <>
            <CallButton>Call {DEALER_PHONE}</CallButton>
            {/* The claim form is at the foot of a long page: on a phone this is the way to it. */}
            <a href="#claim" className={`flex h-12 w-full items-center justify-center px-5 sm:w-auto sm:min-w-60 ${secondaryButton}`}>
              Make a claim
            </a>
          </>
        }
      />

      <section className="mt-12 flex flex-col gap-4">
        <h2 className={subTitle}>What you get</h2>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FeatureCard badge={<ShieldCheckIcon className="size-6" />} title={WARRANTY.title} text={`${WARRANTY.text} It's included in the price of the car.`} />
          <FeatureCard badge={<LayersIcon className="size-6" />} title="Extended warranty" text="Longer cover is available. Ask us what it covers and what it costs for the car you're looking at." />
        </ul>
      </section>

      <div className="mt-12 grid max-w-5xl grid-cols-1 gap-x-10 gap-y-8 text-body md:grid-cols-2">
        <InfoSection title="What is covered">
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>The engine and its internal parts</li>
            <li>The gearbox, manual or automatic</li>
            <li>Parts and labour for a covered repair</li>
          </ul>
        </InfoSection>
        <InfoSection title="What is not covered">
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>Wear and tear: tyres, brakes, clutch, wipers, bulbs and batteries</li>
            <li>Servicing and routine maintenance</li>
            <li>Damage from an accident, misuse or racing</li>
            <li>Faults caused by work done outside our approved garages</li>
          </ul>
        </InfoSection>
        <InfoSection title="How to make a claim">
          <ol className="flex list-decimal flex-col gap-1 pl-5">
            <li>Stop driving if it is unsafe, and call us</li>
            <li>Tell us the car, the fault and when it started</li>
            <li>We book it in and confirm the repair is covered before work starts</li>
          </ol>
        </InfoSection>
        <InfoSection title="Keeping your cover">
          <p>Service the car on time and keep the receipts. Tell us about any warning lights as soon as they come on. Cover runs for 12 months from the day you collect the car.</p>
        </InfoSection>
        <InfoSection title="Your rights">
          <p>The warranty is on top of your legal rights as a buyer. A car must be as described, of satisfactory quality and fit for purpose.</p>
        </InfoSection>
        <InfoSection title="Questions">
          <p>Call us on {DEALER_PHONE} and ask for the full terms for the car you are looking at.</p>
        </InfoSection>
      </div>

      {/* Step two of making a claim, written down: it reaches the dealer as a warranty claim. Unsafe to drive is still a phone call. */}
      <section id="claim" className="mt-12 flex max-w-2xl scroll-mt-24 flex-col gap-4">
        <h2 className={subTitle}>Make a claim</h2>
        <p className="text-body text-text-2">If the car is unsafe to drive, call us instead.</p>
        <div className={`${card} p-4 sm:p-5`}>
          <LeadPageForm form="warranty" submitLabel="Send claim" success={CLAIM_SENT} />
        </div>
      </section>
    </main>
  );
}
