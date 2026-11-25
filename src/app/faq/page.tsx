import type { Metadata } from "next";
import Link from "next/link";
import { OpeningHours } from "@/components/OpeningHours";
import { PageHeading } from "@/components/PageHeading";
import { ChevronDownIcon } from "@/components/stock/icons";
import { pageMain, subTitle } from "@/components/ui";

// A link inside a sentence: underlined, no taller than the line.
const inline = "font-medium underline underline-offset-2";
import { FINANCE } from "@/lib/finance/finance.config";
import { DEALER_ADDRESS_TEXT, DEALER_LOCATION, DEALER_PHONE, DEALER_TEL, SITE_NAME, WARRANTY } from "@/lib/site";

export const metadata: Metadata = { title: "Questions", description: `Answers to common questions about buying, selling, finance and warranty at ${SITE_NAME} in ${DEALER_LOCATION}.` };

// Every answer is built from what the site already says (the warranty, the finance wording, the selling pages, the hours), so it makes no
// promise the dealer has not made elsewhere and changes when they do. No FAQ structured data: Google shows FAQ results only for government
// and health sites since 2023.
type QA = { q: string; a: React.ReactNode };
const tel = <a href={`tel:${DEALER_TEL}`} className={inline}>{DEALER_PHONE}</a>;

const faqId = (title: string) => `faq-${title.toLowerCase().replace(/\s+/g, "-")}`; // no spaces: aria-labelledby reads ids as a list

const GROUPS: { title: string; items: QA[] }[] = [
  {
    title: "Buying",
    items: [
      { q: "Can I see a car before I buy it?", a: <>Yes. <Link href="/test-drive" className={inline}>Book a test drive</Link> online, or call us on {tel} to arrange a viewing.</> },
      { q: "What if you don't have the car I want?", a: <>Tell us what you&apos;re looking for and we&apos;ll look for it. <Link href="/find-a-car" className={inline}>Find a car</Link></> },
      { q: "Do the prices of commercials include VAT?", a: <>Commercials show the price without VAT, which a VAT-registered buyer can usually reclaim, with the price including VAT underneath. Cars show the full price.</> },
    ],
  },
  {
    title: "Warranty",
    items: [
      { q: "Does a used car come with a warranty?", a: <>{WARRANTY.title}: {WARRANTY.text.charAt(0).toLowerCase() + WARRANTY.text.slice(1)} It&apos;s included in the price, and longer cover is available. <Link href="/warranty" className={inline}>What it covers</Link></> },
      { q: "Does the warranty change my rights?", a: <>No. It&apos;s on top of your legal rights as a buyer: a car must be as described, of satisfactory quality and fit for purpose.</> },
    ],
  },
  {
    title: "Finance",
    items: [
      { q: "Can I buy a car on finance?", a: <>Yes, through a lender. Our <Link href="/finance" className={inline}>finance estimator</Link> shows roughly what a monthly payment could be. {FINANCE.notice}</> },
    ],
  },
  {
    title: "Selling and trading in",
    items: [
      { q: "Will you buy my car if I'm not buying one?", a: <>Yes, we buy good cars. Tell us about it and send photos, and we come back with an offer. <Link href="/sell-your-car" className={inline}>Sell your car</Link></> },
      { q: "Can I trade in my car against one of yours?", a: <>Yes. We value yours and take it off the price of the car you buy, and can usually offer more than for a straight sale. <Link href="/trade-in" className={inline}>Trade in your car</Link></> },
      { q: "Is the price you give me final?", a: <>It&apos;s an estimate until we&apos;ve seen the car.</> },
      { q: "How do you pay for my car?", a: <>By bank transfer when we collect it.</> },
    ],
  },
  {
    title: "Visiting us",
    items: [
      { q: "Where are you?", a: <>{DEALER_ADDRESS_TEXT}. <Link href="/contact" className={inline}>Directions</Link></> },
      { q: "When are you open?", a: <OpeningHours /> },
      { q: "Do you service cars?", a: <>Yes. Call us on {tel} to book it in. <Link href="/service" className={inline}>Our services</Link></> },
    ],
  },
];

export default function FaqPage() {
  return (
    <main className={pageMain}>
      <PageHeading title="Questions" intro={<>The ones we&apos;re asked most. Something else? Call us on {tel}.</>} />
      <div className="mt-10 flex max-w-measure flex-col gap-10">
        {GROUPS.map((g) => (
          <section key={g.title} aria-labelledby={faqId(g.title)} className="flex flex-col gap-2">
            <h2 id={faqId(g.title)} className={subTitle}>
              {g.title}
            </h2>
            <ul className="flex flex-col divide-y divide-hairline border-y border-hairline">
              {g.items.map((it) => (
                <li key={it.q}>
                  <details className="group">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-body font-medium [&::-webkit-details-marker]:hidden">
                      {it.q}
                      <ChevronDownIcon className="size-5 shrink-0 text-text-2 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="pb-4 text-body">{it.a}</div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
