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
  description: `The makes in stock at ${SITE_NAME} in ${DEALER_LOCATION}.`,
};
export const dynamic = "force-dynamic";

// The makes in stock, as tiles with their counts. Each opens its make page.
export default async function MakesPage() {
  const inStock = await makeDirectory(); // in stock only: a make with none is still reachable at its own page, just not listed
  return (
    <main className={pageMain}>
      <PageHeading title="Makes" intro="The makes we have in stock now." />
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
    </main>
  );
}
