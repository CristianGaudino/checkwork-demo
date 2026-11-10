import Link from "next/link";
import { ArrowRightIcon } from "@/components/stock/icons";
import { card, press, sectionTitle } from "@/components/ui";
import { VEHICLE_TYPES } from "@/lib/nav";

type Option = { slug: string; label: string };

// "Shop by type": one tile per body type that has a car in stock now, each opening the stock filtered to it.
export function ShopByType({ bodies }: { bodies: Option[] }) {
  // New cars and vans first (once those sections are on), then each body type that has a car in stock.
  const items = [
    ...VEHICLE_TYPES.filter((t) => t.enabled && t.condition !== "used").map((t) => ({ key: t.id, href: t.href, label: t.id === "commercial" ? "Vans" : `${t.label} cars` })),
    ...bodies.map((b) => ({ key: b.slug, href: `/used-cars?body=${b.slug}`, label: b.label })),
  ];
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="shop-by-type" className="flex flex-col gap-4">
      <h2 id="shop-by-type" className={sectionTitle}>Shop by Type</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((b) => (
          <li key={b.key}>
            <Link href={b.href} className={`${card} flex min-h-24 flex-col justify-between p-4 transition-shadow hover:shadow-lift ${press}`}>
              <span className="text-body font-semibold">{b.label}</span>
              <ArrowRightIcon aria-hidden="true" className="size-5 text-accent" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
