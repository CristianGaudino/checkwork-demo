import type { Metadata } from "next";
import { CallButton } from "@/components/InfoPage";
import { FeatureCard, FeatureSection } from "@/components/Feature";
import { ServiceMenu } from "@/components/service/ServiceMenu";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { pageMain, subTitle } from "@/components/ui";
import { DEALER_LOCATION, DEALER_PHONE, SERVICES, SITE_NAME } from "@/lib/site";
import { PageHeading, PagePhoto } from "@/components/PageHeading";

export const metadata: Metadata = { title: "Service", description: `Servicing, repairs and tyres at ${SITE_NAME} in ${DEALER_LOCATION}. Call us to book your car in.` };

// PLACEHOLDER copy: the dealer confirms what is offered (DEALER_FACTS_CONFIRMED). What is offered lives in SERVICES in site.ts.
const WHY = [
  { title: "Straight answers", text: "We tell you what your car needs now and what can wait." },
  { title: "Agreed before we start", text: "You know what the work involves and what it will cost before we begin." },
  { title: "Booked in properly", text: "Call or message us and we find a time that suits you." },
];

export default function ServicePage() {
  return (
    <main className={pageMain}>
      {/* The dealership beside the title from 1024px, with the call and WhatsApp buttons under the words. */}
      <PageHeading
        title="Service"
        intro="Keep your car running well. Call us to book it in, or choose a service to find out more."
        picture={<PagePhoto src="/brand/service.webp" width={1200} height={900} position="object-[50%_25%]" />}
        actions={
          <>
            <CallButton>Call {DEALER_PHONE}</CallButton>
            <WhatsAppButton />
          </>
        }
      />

      <section className="mt-12 flex flex-col gap-4">
        <h2 className={subTitle}>What we do</h2>
        <ServiceMenu services={SERVICES} />
      </section>

      <div className="mt-12">
        <FeatureSection title="Why choose us">
          {WHY.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </FeatureSection>
      </div>
    </main>
  );
}
