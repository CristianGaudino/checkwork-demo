import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { IconBadge, TitleText } from "@/components/Feature";
import { BrowseByMake } from "@/components/home/BrowseByMake";
import { HeroMosaic } from "@/components/home/HeroMosaic";
import { HomeSearch } from "@/components/home/HomeSearch";
import { ShopByType } from "@/components/home/ShopByType";
import { TrustStrip } from "@/components/home/TrustStrip";
import { VisitUs } from "@/components/home/VisitUs";
import { VehicleSwitch } from "@/components/VehicleSwitch";
import { JsonLd } from "@/components/JsonLd";
import { ReviewsStrip } from "@/components/reviews/ReviewsStrip";
import { ListingCard } from "@/components/stock/ListingCard";
import { ArrowRightIcon } from "@/components/stock/icons";
import { accentButton, eyebrow, sectionTitle, secondaryButton, textLink } from "@/components/ui";
import { dealerJsonLd } from "@/lib/dealer";
import { HOME } from "@/lib/home.config";
import { getReviews } from "@/lib/reviews";
import { DEALER_ADDRESS, DEALER_ADDRESS_LINES, DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { queryAllOrNull } from "@/lib/stock";
import { searchOptions } from "@/lib/stock/search-options";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} | Used cars in ${DEALER_ADDRESS.town}` },
  description: `Browse the used cars in stock at our dealership in ${DEALER_LOCATION}.`,
};

export default async function Home() {
  // Env decides the reviews provider at request time. Not force-dynamic: that would turn off the fetch cache.
  await connection();
  // The home page must never error: a stock failure shows a line in place of the grid, and the search still renders (UI-SPEC state table).
  // The newest cars feed the featured grid and the hero tiles, and all of them feed the search drop-downs, so every choice has a car behind it.
  const [all, reviews] = await Promise.all([queryAllOrNull(), getReviews()]);
  const featured = all?.cars.slice(0, HOME.featuredCount) ?? null;
  const search = searchOptions(all?.cars ?? []);
  return (
    <main className="flex flex-col">
      <JsonLd data={dealerJsonLd(reviews)} />
      <section className="border-b border-hairline">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-12 lg:px-8 lg:py-14">
          <div className="flex min-w-0 flex-col items-start">
            <p className={eyebrow}>Quality Used Cars</p>
            <h1 className="mt-3 max-w-[10ch] text-hero font-bold lg:text-hero-lg">Find Your Next Car</h1>
            <p className="mt-4 max-w-[40ch] text-body">A carefully selected range of quality used cars, backed by trusted service and straightforward finance.</p>
            <p className="mt-2 max-w-[65ch] text-meta text-text-2">Find us at {DEALER_ADDRESS_LINES.join(", ").replace(/ (\S+)$/, " $1")}.</p>
            <div className="mt-6 flex w-full flex-wrap gap-3">
              <Link href="/used-cars" className={`inline-flex w-full items-center justify-center gap-2 sm:w-auto ${accentButton}`}>
                Browse Our Stock
                <ArrowRightIcon className="size-5" />
              </Link>
              <Link href="/finance" className={`inline-flex h-12 w-full items-center justify-center gap-2 px-6 sm:w-auto ${secondaryButton}`}>
                Estimate Your Finance
              </Link>
            </div>
            <div className="mt-8 w-full">
              <HomeSearch makes={search.makes} bodies={search.bodies} models={search.models} />
            </div>
            {/* On a phone the header has no room for the switch: it sits under the search. */}
            <VehicleSwitch className="mt-4 inline-flex lg:hidden" />
          </div>
          <HeroMosaic cars={all?.cars ?? []} />
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-12 px-4 pb-16 pt-12 sm:px-6 lg:gap-16 lg:px-8">
        <ShopByType bodies={search.bodies.slice(0, HOME.shopByTypeMax)} />

        <section aria-labelledby="featured" className="flex flex-col gap-4">
          {!featured ? (
            <>
              <p className="text-body">We couldn&apos;t load the cars.</p>
              <Link href="/used-cars" className={textLink}>
                See Used Cars
              </Link>
            </>
          ) : featured.length === 0 ? (
            <>
              <h2 id="featured" className="text-heading font-semibold">No Cars Listed Right Now</h2>
              <Link href="/find-a-car" className={textLink}>
                Can&apos;t find it? Ask us to find it for you.
              </Link>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <h2 id="featured" className={sectionTitle}>Featured Stock</h2>
                <Link href="/used-cars" className={`${textLink} shrink-0 gap-2 whitespace-nowrap`}>
                  View All Stock
                  <ArrowRightIcon className="size-5" />
                </Link>
              </div>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {featured.map((car, i) => (
                  <li key={car.id} className="min-w-0">
                    <ListingCard car={car} priority={i < 2} oneLine />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <TrustStrip />

        <section className="hero-bg grid grid-cols-1 gap-8 rounded-card p-6 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:gap-12 lg:p-12">
          <div className="flex flex-col items-start gap-4">
            <h2 className={sectionTitle}>Finance Made Simple</h2>
            <p className="max-w-[40ch] text-body text-text-2">Estimate your monthly payment online, then send us your details to start the process.</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link href="/finance" className={`inline-flex items-center gap-2 ${accentButton} lg:h-14 lg:px-8 lg:text-heading`}>
                Check Finance Options
                <ArrowRightIcon className="size-5" />
              </Link>
              <Link href="/trade-in" className={`inline-flex h-12 items-center gap-2 px-6 lg:h-14 lg:px-8 ${secondaryButton}`}>
                Value Your Trade-In
              </Link>
            </div>
          </div>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              ["1", "Pick a car", "Or type a price. Choose a deposit and a term."],
              ["2", "See an estimate", "A monthly figure, worked out as you go."],
              ["3", "We call you", "Send your details and we come back with the real amounts."],
            ].map(([n, title, text]) => (
              <li key={n} className="flex gap-4 rounded-card bg-card p-4 sm:flex-col">
                <IconBadge size="sm">{n}</IconBadge>
                <TitleText title={title} text={text} />
              </li>
            ))}
          </ol>
        </section>

        <BrowseByMake makes={search.makes.slice(0, HOME.makeChipsMax)} />

        <ReviewsStrip data={reviews} />

        <VisitUs />
      </div>
    </main>
  );
}
