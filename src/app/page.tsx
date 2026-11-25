import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { IconBadge, TitleText } from "@/components/Feature";
import { BrowseByMake } from "@/components/home/BrowseByMake";
import { HeroMosaic } from "@/components/home/HeroMosaic";
import { HomeSearch } from "@/components/home/HomeSearch";
import { BrowseByType, type TypeTile } from "@/components/home/BrowseByType";
import { makeDirectory } from "@/lib/stock/makes";
import { NOUNS } from "@/lib/stock/format";
import { TrustStrip } from "@/components/home/TrustStrip";
import { AffiliationBadges } from "@/components/Affiliations";
import { VisitUs } from "@/components/home/VisitUs";
import { JsonLd } from "@/components/JsonLd";
import { ReviewsStrip } from "@/components/reviews/ReviewsStrip";
import { ListingCard } from "@/components/stock/ListingCard";
import { ArrowRightIcon } from "@/components/stock/icons";
import { RecentlyViewed } from "@/components/recent/RecentlyViewed";
import { accentButton, card, pageMain, pageWidth, press, sectionTitle, secondaryButton, textLink } from "@/components/ui";
import { dealerJsonLd } from "@/lib/dealer";
import { HOME } from "@/lib/home.config";
import { getReviews } from "@/lib/reviews";
import { DEALER_ADDRESS, DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { queryAllOrNull } from "@/lib/stock";
import { searchOptions } from "@/lib/stock/search-options";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} | Car dealer in ${DEALER_ADDRESS.town}` },
  description: `Browse the used cars in stock at our dealership in ${DEALER_LOCATION}.`,
};

// The hero's two links, on the photo.
const heroButton = `inline-flex h-12 w-full items-center justify-center gap-2 rounded-control border border-hairline bg-card px-6 font-medium text-text sm:w-auto ${press}`;

export default async function Home() {
  // Env decides the reviews provider at request time. Not force-dynamic: that would turn off the fetch cache.
  await connection();
  // The home page must never error: a stock failure shows a line in place of the grid, and the search still renders (UI-SPEC state table).
  // The newest cars feed the featured grid, and all of them feed the search drop-downs, so every choice has a car behind it.
  const [all, reviews, vans] = await Promise.all([queryAllOrNull(), getReviews(), queryAllOrNull({ condition: "commercial" })]);
  // Browse by type: vans, then each body type of the used stock, each with its newest car's photo and how many there are.
  const used = all?.cars ?? [];
  const typeTiles: TypeTile[] = [
    ...(vans?.total ? [{ key: "commercial", href: "/commercial", label: "Vans", count: vans.total, noun: NOUNS.commercial, photo: vans.cars[0]?.photos[0] }] : []),
    ...searchOptions(used).bodies.map((b) => {
      const of = used.filter((c) => c.bodySlug === b.slug);
      return { key: b.slug, href: `/used-cars/${b.slug}`, label: b.label, count: of.length, photo: of[0]?.photos[0] };
    }),
  ].slice(0, HOME.shopByTypeMax);
  const makes = await makeDirectory();
  const featured = all?.cars.slice(0, HOME.featuredCount) ?? null;
  const search = searchOptions(all?.cars ?? []);
  return (
    <main className="flex flex-col">
      <JsonLd data={dealerJsonLd(reviews)} />
      {/* The showroom window: the dealership photo full width with light falling from the top, the line on the left and the search floating on glass. */}
      <section className="relative isolate overflow-hidden">
        <HeroMosaic />
        <div className={`${pageWidth} grid grid-cols-1 gap-8 pb-16 pt-16 lg:min-h-[38rem] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end lg:gap-12 lg:pb-28 lg:pt-24`}>
          <div className="theme-dark flex min-w-0 flex-col items-start text-text">
            <h1 className="max-w-[14ch] text-balance text-hero font-semibold lg:text-hero-lg">{HOME.heroTitle}</h1>
            <p className="mt-4 max-w-[40ch] text-body text-text/90">{HOME.heroIntro}</p>
            <div className="mt-6 flex w-full flex-wrap gap-3">
              <Link href="/used-cars" className={heroButton}>
                Browse stock
                <ArrowRightIcon className="size-5" />
              </Link>
              <Link href="/finance" className={heroButton}>
                Estimate finance
              </Link>
            </div>
          </div>
          <div className="w-full rounded-card border border-hairline bg-surface p-1 shadow-panel">
            <HomeSearch makes={search.makes} bodies={search.bodies} models={search.models} />
          </div>
        </div>
      </section>

      <div className={`${pageMain} flex flex-col gap-12 lg:gap-16`}>

        <section aria-labelledby="featured" className="flex flex-col gap-4">
          {!featured ? (
            <>
              <p className="text-body">We couldn&apos;t load the cars.</p>
              <Link href="/used-cars" className={textLink}>
                See used cars
              </Link>
            </>
          ) : featured.length === 0 ? (
            <>
              <h2 id="featured" className="text-heading font-semibold">No cars listed right now</h2>
              <Link href="/find-a-car" className={textLink}>
                Can&apos;t find it? Ask us to find it for you.
              </Link>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <h2 id="featured" className={sectionTitle}>Featured stock</h2>
                <Link href="/used-cars" className={`${textLink} gap-2`}>
                  View all stock
                  <ArrowRightIcon className="size-5" />
                </Link>
              </div>
              {/* A grid from 640px; on a phone a row to swipe, the next card peeking, so six cars do not make the page six screens long. */}
              <ul aria-label="Featured stock" className="scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 lg:gap-6">
                {featured.map((car, i) => (
                  <li key={car.id} className="w-[85%] min-w-0 shrink-0 snap-start sm:w-auto">
                    <ListingCard car={car} priority={i < 2} oneLine />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <TrustStrip />
        <AffiliationBadges />

        {/* All about finance. */}
        <section className={`@container ${card} grid grid-cols-1 gap-8 p-6 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:gap-12 lg:p-12`}>
          <div className="flex flex-col items-start gap-4">
            <h2 className={sectionTitle}>Finance on any car we sell</h2>
            <p className="max-w-[40ch] text-body text-text-2">Estimate your monthly payment online, then send us your details to start the process.</p>
            {/* Full width and stacked on a phone, like the hero's two buttons; side by side from 640px. */}
            <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <Link href="/finance" className={`inline-flex items-center justify-center gap-2 ${accentButton}`}>
                Check finance options
                <ArrowRightIcon className="size-5" />
              </Link>
              <Link href="/trade-in" className={`inline-flex h-12 items-center justify-center gap-2 px-6 ${secondaryButton}`}>
                Value your trade-in
              </Link>
            </div>
          </div>
          {/* The section is the container (queries in rem): three across from 640px while there is room, one with large text. On a phone
              the number sits beside its step, above it when large text leaves too little room. */}
          <ol className="grid grid-cols-1 gap-4 sm:@min-[30rem]:grid-cols-3">
            {[
              ["1", "Pick a car", "Or type a price. Choose a deposit and a term."],
              ["2", "See an estimate", "A monthly figure, worked out as you go."],
              ["3", "We call you", "Send your details and we come back with the real amounts."],
            ].map(([n, title, text]) => (
              <li key={n} className="flex flex-col gap-4 border-t border-hairline pt-4 max-sm:@min-[14rem]:flex-row">
                <IconBadge>{n}</IconBadge>
                <TitleText title={title} text={text} />
              </li>
            ))}
          </ol>
        </section>

        {/* Below the fold: it arrives after hydration, so it must not sit where it would push what is in view. */}
        <RecentlyViewed max={3} />

        {/* Only the makes we have: the rest are on the Makes page ("All makes"). */}
        <BrowseByMake makes={makes.slice(0, HOME.makeChipsMax)} />

        <BrowseByType tiles={typeTiles} />

        <ReviewsStrip data={reviews} />

        <VisitUs />
      </div>
    </main>
  );
}
