import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { stock } from "@/lib/stock";
import { findMake } from "@/lib/stock/makes";
import { accentButton, pageMain } from "@/components/ui";

export const metadata: Metadata = { title: "Car no longer available", robots: { index: false } };

export default async function GonePage({ params }: PageProps<"/gone/[make]">) {
  const { make: slug } = await params;
  // A van or new car of a make never listed used has no used page: it goes to the make's page, which lists every kind.
  const used = (await stock.taxonomy()).makes.find((m) => m.slug === slug);
  const make = used ?? (await findMake(slug));
  if (!make) notFound();

  return (
    <main className={pageMain}>
      <h1 className="text-display font-semibold">This car is no longer available</h1>
      <p className="mt-4 max-w-measure text-body text-text-2">It has been sold or taken off our site. Here is what else we have.</p>
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
    </main>
  );
}
