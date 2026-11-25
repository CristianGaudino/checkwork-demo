import type { Metadata } from "next";
import { FeatureCard, IconBadge, TitleText } from "@/components/Feature";
import { DirectionsButton } from "@/components/DirectionsButton";
import { OpeningHours } from "@/components/OpeningHours";
import { pageMain, subTitle } from "@/components/ui";
import { dealerDirectionsUrl } from "@/lib/dealer";
import { DEALER_ADDRESS, DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { PageHeading, PagePhoto } from "@/components/PageHeading";
import { AffiliationList } from "@/components/Affiliations";

export const metadata: Metadata = { title: "About us", description: `${SITE_NAME} is a car dealer in ${DEALER_LOCATION}: carefully chosen cars, plain answers and no pressure.` };

// The dealer's own story replaces this copy: no history, awards, years trading or staff names are invented here.
const WHY = [
  { title: "Every car shown in full", text: "Each car has its details, photos and history on its page." },
  { title: "Straightforward buying", text: "Plain answers and no pressure. Ask us anything about a car before you decide." },
  { title: "Finance", text: "Estimate your monthly payment online before you call." },
  { title: "Trade-ins", text: "Get a valuation on the car you're trading in." },
];
const EXPECT = [
  { title: "Browse", text: "Look through the stock online, save the cars you like and compare them." },
  { title: "Get in touch", text: "Enquire, book a test drive, or call us. We'll answer your questions." },
  { title: "Come and see it", text: `Visit us in ${DEALER_ADDRESS.town}, see the car and take it for a drive.` },
];

export default function AboutPage() {
  return (
    <main className={pageMain}>
      <PageHeading title="About us" intro={`${SITE_NAME} is a car dealer in ${DEALER_LOCATION}. Call in, look around and ask us anything.`} picture={<PagePhoto src="/brand/about.webp" width={1200} height={900} />} />
      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-12">
        {/* From 1024px the hours sit on the right; on a phone they come after the reasons. */}
        <div className="flex flex-col gap-6 lg:order-2">
          <OpeningHours />
          <DirectionsButton href={dealerDirectionsUrl()} />
        </div>
        <div className="flex flex-col gap-10 lg:order-1">
          <section className="flex flex-col gap-4">
            <h2 className={subTitle}>How we sell</h2>
            <ul className="grid grid-cols-1 gap-4">
              {WHY.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </ul>
          </section>
          <section className="@container flex flex-col gap-4">
            <h2 className={subTitle}>What to expect</h2>
            {/* As on the home page, the section is the container: one column with large text, the number above its step. */}
            <ol className="grid grid-cols-1 gap-3 sm:@min-[30rem]:grid-cols-3">
              {EXPECT.map((s, i) => (
                // The same numbered step as the form pages and the finance band.
                <li key={s.title} className="flex flex-col gap-4 max-sm:@min-[14rem]:flex-row">
                  <IconBadge>{i + 1}</IconBadge>
                  <TitleText title={s.title} text={s.text} />
                </li>
              ))}
            </ol>
          </section>
          <AffiliationList />
        </div>
      </div>
    </main>
  );
}
