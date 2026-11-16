import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MakeLogo } from "@/components/MakeLogo";
import { ListingCard } from "@/components/stock/ListingCard";
import { ChevronRightIcon } from "@/components/stock/icons";
import { card, pageMain, pageTitle, secondaryButton, subTitle } from "@/components/ui";
import { DEALER_ADDRESS, DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { stock } from "@/lib/stock";
import { countLabel } from "@/lib/stock/format";
import { carsOfMake, findMake } from "@/lib/stock/makes";
import { DEFAULT_QUERY } from "@/lib/stock/query";
import type { Car, Condition } from "@/lib/stock/types";
import { IfModule } from "@/components/IfModule";
import { enabledModules } from "@/lib/modules";
import { pathAllowed } from "@/lib/modules-rules";

// One page per make: what we have of it across used, new and commercial, a few of each with the way to the full list; or, with none in
// stock, what we sold recently, what we have that is like it, and an offer to find one.
export const dynamic = "force-dynamic";

const SECTIONS: { kind: Condition; title: (make: string) => string; href: (slug: string) => string }[] = [
  { kind: "used", title: (m) => `Used ${m}`, href: (s) => `/used-cars/${s}` },
  { kind: "new", title: (m) => `New ${m}`, href: (s) => `/new-cars/${s}` },
  { kind: "commercial", title: (m) => `${m} vans and commercials`, href: (s) => `/commercial/${s}` },
];
const PER_SECTION = 3;

export async function generateMetadata({ params }: PageProps<"/makes/[make]">): Promise<Metadata> {
  const make = await findMake((await params).make);
  if (!make) return {};
  const title = `${make.label} for sale in ${DEALER_ADDRESS.town}`;
  const description = make.count
    ? `${countLabel(make.count)} from ${make.label} in stock at ${SITE_NAME}, ${DEALER_LOCATION}: used, new and commercial.`
    : `No ${make.label} in stock at ${SITE_NAME} right now. We can find one for you, and you can see what we have that is similar.`;
  return { title, description, alternates: { canonical: `/makes/${make.slug}` }, ...(make.count ? {} : { robots: { index: false } }) };
}

export default async function MakePage({ params }: PageProps<"/makes/[make]">) {
  const make = await findMake((await params).make);
  if (!make) notFound();
  const cars = await carsOfMake(make.slug);
  const of = (kind: Condition) => cars.filter((c) => (c.condition ?? "used") === kind);
  const modules = await enabledModules(); // new cars and vans are modules (#173): their sections go with them
  const parts = SECTIONS.filter((s) => make.byKind[s.kind] > 0 && pathAllowed(s.href(make.slug), modules)).map((s) => `${make.byKind[s.kind]} ${s.kind === "commercial" ? "commercial" : s.kind}`);

  return (
    <main className={pageMain}>
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center text-meta">
          <li className="flex items-center">
            <Link href="/makes" className="inline-flex min-h-11 items-center underline">
              Makes
            </Link>
          </li>
          <li className="flex items-center">
            <ChevronRightIcon className="mx-1 size-4 shrink-0 text-text-2" />
            <span aria-current="page" className="inline-flex min-h-11 items-center text-text-2">
              {make.label}
            </span>
          </li>
        </ol>
      </nav>
      <h1 className={`mt-6 flex items-center gap-3 ${pageTitle}`}>
        <MakeLogo slug={make.slug} className="size-9 sm:size-11" standalone />
        {make.label}
      </h1>
      <p className="mt-2 max-w-measure text-body text-text-2">
        {make.count ? `${countLabel(make.count)} in stock in ${DEALER_ADDRESS.town}: ${parts.join(", ")}.` : `No ${make.label} in stock right now.`}
      </p>

      {make.count > 0 ? (
        <div className="mt-8 flex flex-col gap-12">
          {SECTIONS.filter((s) => make.byKind[s.kind] > 0 && pathAllowed(s.href(make.slug), modules)).map((s) => (
            <section key={s.kind} aria-labelledby={`make-${s.kind}`} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                <h2 id={`make-${s.kind}`} className={subTitle}>
                  {s.title(make.label)}
                </h2>
                <Link href={s.href(make.slug)} className="inline-flex min-h-11 items-center text-meta font-medium underline">
                  See all {make.byKind[s.kind]}
                </Link>
              </div>
              <Cards cars={of(s.kind).slice(0, PER_SECTION)} />
            </section>
          ))}
          <FindOne make={make.label} />
        </div>
      ) : (
        <Empty make={make} />
      )}
    </main>
  );
}

function Cards({ cars }: { cars: Car[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {cars.map((car, i) => (
        <ListingCard key={car.id} car={car} priority={i < 2} />
      ))}
    </div>
  );
}

// The way on when the right one is not here.
function FindOne({ make }: { make: string }) {
  return (
    <div className={`${card} flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between`}>
      <div className="flex flex-col gap-1">
        <h2 className={subTitle}>Looking for a particular {make}?</h2>
        <p className="text-body text-text-2">Tell us the model, year and budget and we will look for it. No obligation.</p>
      </div>
      <IfModule href="/find-a-car">
      <Link href={`/find-a-car?make=${encodeURIComponent(make)}`} className={`inline-flex h-12 shrink-0 items-center px-6 ${secondaryButton}`}>
        Find one for me
      </Link>
      </IfModule>
    </div>
  );
}

// Nothing in stock: say so, show what we sold recently, what we have that is like it, and offer to find one.
async function Empty({ make }: { make: { slug: string; label: string } }) {
  const [sold, latest] = await Promise.all([
    stock.query({ ...DEFAULT_QUERY, make: [make.slug], sold: "only", pageSize: 3 }).catch(() => null),
    stock.query({ ...DEFAULT_QUERY, pageSize: 6 }).catch(() => null),
  ]);
  // Like it: the body types we sold of this make, else the newest cars we have.
  const bodies = [...new Set((sold?.cars ?? []).map((c) => c.bodySlug).filter((b): b is string => Boolean(b)))];
  const alike = bodies.length ? await stock.query({ ...DEFAULT_QUERY, body: bodies, pageSize: 6 }).catch(() => null) : null;
  const similar = (alike?.cars.length ? alike : latest)?.cars.slice(0, 6) ?? [];
  return (
    <div className="mt-8 flex flex-col gap-12">
      <FindOne make={make.label} />
      {(sold?.cars.length ?? 0) > 0 && (
        <section aria-labelledby="make-sold" className="flex flex-col gap-4">
          <h2 id="make-sold" className={subTitle}>
            Recently sold
          </h2>
          <Cards cars={sold!.cars} />
        </section>
      )}
      {similar.length > 0 && (
        <section aria-labelledby="make-similar" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <h2 id="make-similar" className={subTitle}>
              In stock now
            </h2>
            <Link href="/used-cars" className="inline-flex min-h-11 items-center text-meta font-medium underline">
              All used cars
            </Link>
          </div>
          <Cards cars={similar} />
        </section>
      )}
    </div>
  );
}
