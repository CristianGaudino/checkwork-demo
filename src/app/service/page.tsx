import type { Metadata } from "next";
import { CallButton } from "@/components/InfoPage";
import { FeatureCard, FeatureSection } from "@/components/Feature";
import { ServiceMenu } from "@/components/service/ServiceMenu";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { pageMain, secondaryButton, subTitle } from "@/components/ui";
import { DEALER_LOCATION, DEALER_PHONE, SERVICES, SITE_NAME } from "@/lib/site";
import { PageHeading, PagePhoto } from "@/components/PageHeading";

export const metadata: Metadata = { title: "Service", description: `Servicing, repairs and tyres at ${SITE_NAME} in ${DEALER_LOCATION}. Book your car in online or by phone.` };

// PLACEHOLDER copy: the dealer confirms what is offered (DEALER_FACTS_CONFIRMED). What is offered lives in SERVICES in site.ts.
const WHY = [
  { title: "Straight answers", text: "We tell you what your car needs now and what can wait." },
  { title: "Agreed before we start", text: "You know what the work involves and what it will cost before we begin." },
  { title: "Booked in properly", text: "Call or message us and we find a time that suits you." },
];

export default function ServicePage() {
  return (
    <main className={pageMain}>
      {/* The dealership beside the title from 1024px, with the call, WhatsApp and Book a service buttons under the words. */}
      <PageHeading
        title="Service"
        intro="Keep your car running well. Book a service online, or call us."
        picture={<PagePhoto src="/brand/service.webp" width={1200} height={900} position="object-[50%_25%]" />}
        actions={
          <>
            <CallButton>Call {DEALER_PHONE}</CallButton>
            <WhatsAppButton />
            <a href="#book" className={`flex h-12 w-full items-center justify-center px-5 sm:w-auto sm:min-w-60 ${secondaryButton}`}>
              Book a service
            </a>
          </>
        }
      />

      <section id="book" className="mt-12 flex scroll-mt-24 flex-col gap-4">
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
