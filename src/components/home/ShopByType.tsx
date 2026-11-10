import Link from "next/link";
import { ArrowRightIcon } from "@/components/stock/icons";
import { card, press, sectionTitle } from "@/components/ui";

type Option = { slug: string; label: string };

// "Shop by type": one tile per body type that has a car in stock now, each opening the stock filtered to it.
export function ShopByType({ bodies }: { bodies: Option[] }) {
  if (bodies.length === 0) return null;
  return (
    <section aria-labelledby="shop-by-type" className="flex flex-col gap-4">
      <h2 id="shop-by-type" className={sectionTitle}>Shop by Type</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {bodies.map((b) => (
          <li key={b.slug}>
            <Link href={`/used-cars?body=${b.slug}`} className={`${card} flex min-h-24 flex-col justify-between p-4 transition-shadow hover:shadow-lift ${press}`}>
              <span className="text-body font-semibold">{b.label}</span>
              <ArrowRightIcon aria-hidden="true" className="size-5 text-accent" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
