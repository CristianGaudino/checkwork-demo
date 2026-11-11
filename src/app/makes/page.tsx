import type { Metadata } from "next";
import Link from "next/link";
import { MakeLogo } from "@/components/MakeLogo";
import { PageHeading } from "@/components/PageHeading";
import { card, pageMain, press, subTitle } from "@/components/ui";
import { DEALER_LOCATION, SITE_NAME } from "@/lib/site";
import { countLabel } from "@/lib/stock/format";
import { makeDirectory } from "@/lib/stock/makes";

export const metadata: Metadata = {
  title: "Makes",
  description: `Every make at ${SITE_NAME} in ${DEALER_LOCATION}: the ones in stock now, and the ones we can find for you.`,
};
export const dynamic = "force-dynamic";

// Every make: the ones in stock as tiles with their counts, then the rest as a plain list. Each opens its make page.
export default async function MakesPage() {
  const all = await makeDirectory(true);
  const inStock = all.filter((m) => m.count > 0);
  const others = all.filter((m) => m.count === 0).sort((a, b) => a.label.localeCompare(b.label, "en-IE"));
  return (
    <main className={pageMain}>
      <PageHeading title="Makes" intro="The makes we have in stock now, and every other one we can look for." />
      {inStock.length > 0 && (
        <section aria-labelledby="makes-in-stock" className="mt-8 flex flex-col gap-4">
          <h2 id="makes-in-stock" className={subTitle}>In stock</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {inStock.map((m) => (
              <li key={m.slug}>
                <Link href={`/makes/${m.slug}`} className={`${card} flex h-full items-center gap-3 p-4 transition-shadow hover:shadow-lift ${press}`}>
                  <MakeLogo slug={m.slug} className="size-8" />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium break-words">{m.label}</span>
                    <span className="text-meta text-text-2">{countLabel(m.count)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="makes-others" className="mt-12 flex flex-col gap-4">
        <h2 id="makes-others" className={subTitle}>Other makes</h2>
        <p className="max-w-measure text-body text-text-2">None in stock right now. Open one to see what we have that is similar, or ask us to find it.</p>
        <ul className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-5">
          {others.map((m) => (
            <li key={m.slug}>
              <Link href={`/makes/${m.slug}`} className="inline-flex min-h-11 items-center gap-2 underline-offset-2 hover:underline">
                <MakeLogo slug={m.slug} className="size-5" />
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
