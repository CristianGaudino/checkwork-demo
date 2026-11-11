import type { Metadata } from "next";
import Image from "next/image";
import { FeatureCard, IconBadge, TitleText } from "@/components/Feature";
import { CheckIcon, ShieldCheckIcon, SwapIcon } from "@/components/stock/icons";
import { DirectionsButton } from "@/components/DirectionsButton";
import { OpeningHours } from "@/components/OpeningHours";
import { pageMain, subTitle } from "@/components/ui";
import { dealerDirectionsUrl } from "@/lib/dealer";
import { DEALER_ADDRESS, DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = { title: "About us", description: `${SITE_NAME} is a used car dealer in ${DEALER_LOCATION}: a carefully selected range of used cars, finance help and trade-ins.` };

// The dealer's own story replaces this copy: no history, awards, years trading or staff names are invented here.
const WHY = [
  { Icon: CheckIcon, title: "Carefully selected cars", text: "A range of used cars chosen with care, each shown with its details and photos." },
  { Icon: ShieldCheckIcon, title: "Straightforward buying", text: "Plain answers and no pressure. Ask us anything about a car before you decide." },
  { Icon: SwapIcon, title: "Finance and trade-ins", text: "Estimate your monthly payment online, and get a valuation on the car you're trading in." },
];
const EXPECT = [
  { title: "Browse", text: "Look through the stock online, save the cars you like and compare them." },
  { title: "Get in touch", text: "Enquire, book a test drive, or call us. We'll answer your questions." },
  { title: "Come and see it", text: `Visit us in ${DEALER_ADDRESS.town}, see the car and take it for a drive.` },
];

export default function AboutPage() {
  return (
    <main className={pageMain}>
      <PageHeading title="About us" intro={`${SITE_NAME} is a used car dealer in ${DEALER_LOCATION}. Call in, look around and ask us anything.`} />
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-12">
        {/* On a phone the photo comes first; from 1024px it sits on the right with the hours under it. */}
        <div className="flex flex-col gap-6 lg:order-2">
          <Image src="/brand/about.webp" width={1200} height={900} alt="" className="aspect-photo w-full rounded-card object-cover" />
          <OpeningHours />
          <DirectionsButton href={dealerDirectionsUrl()} />
        </div>
        <div className="flex flex-col gap-10 lg:order-1">
          <section className="flex flex-col gap-4">
            <h2 className={subTitle}>Why choose us</h2>
            <ul className="grid grid-cols-1 gap-3">
              {WHY.map(({ Icon, ...f }) => (
                <FeatureCard key={f.title} badge={<Icon className="size-6" />} {...f} />
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-4">
            <h2 className={subTitle}>What to expect</h2>
            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {EXPECT.map((s, i) => (
                // The same numbered step as the form pages and the finance band.
                <li key={s.title} className="flex gap-4 sm:flex-col">
                  <IconBadge size="sm">{i + 1}</IconBadge>
                  <TitleText title={s.title} text={s.text} />
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </main>
  );
}
