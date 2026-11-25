import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingCard } from "@/components/stock/ListingCard";
import { stock } from "@/lib/stock";
import { findMake } from "@/lib/stock/makes";
import { DEFAULT_QUERY } from "@/lib/stock/query";
import { accentButton, pageMain, pageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Car no longer available", robots: { index: false } };

// Three used cars for sale, of the given makes (none: any make). A stock failure shows none rather than failing the page.
const few = (make: string[]) => stock.query({ ...DEFAULT_QUERY, make, pageSize: 3 }).then((r) => r.cars, () => []);

export default async function GonePage({ params }: PageProps<"/gone/[make]">) {
  const { make: slug } = await params;
  // A van of a make never listed used has no used page: it goes to the make's page, which lists every kind.
  const used = (await stock.taxonomy()).makes.find((m) => m.slug === slug);
  const make = used ?? (await findMake(slug));
  if (!make) notFound();
  // Others of the same make first; with none left, the newest cars.
  const sameMake = used ? await few([used.slug]) : [];
  const cars = sameMake.length ? sameMake : await few([]);

  // Left-aligned like the lists, so the heading lines up with a row of one, two or three cars at any width.
  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>This car is no longer available</h1>
      <p className="mt-4 max-w-measure text-body text-text-2">It has been sold or taken off our site.{cars.length > 0 && " Here is what else we have."}</p>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link
          href={`${used ? "/used-cars" : "/makes"}/${make.slug}`}
          className={`inline-flex items-center ${accentButton}`}
        >
          See more {make.label}
        </Link>
        <Link href="/used-cars" className="inline-flex min-h-11 items-center text-body font-semibold underline">
          See all used cars
        </Link>
      </div>
      {cars.length > 0 && (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {cars.map((car, i) => (
            <ListingCard key={car.id} car={car} priority={i < 2} />
          ))}
        </div>
      )}
    </main>
  );
}
