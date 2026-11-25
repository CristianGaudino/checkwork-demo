import Image from "next/image";
import Link from "next/link";
import { card, press, sectionTitle } from "@/components/ui";
import { countLabel } from "@/lib/stock/format";
import type { Photo } from "@/lib/stock/types";

export type TypeTile = { key: string; href: string; label: string; count: number; photo?: Photo };

// "Browse by type": a tile per kind of vehicle we have, each with a car of that type on its plinth and how many there are, opening the
// stock filtered to it. Vans first, then the body types of the used stock.
export function BrowseByType({ tiles }: { tiles: TypeTile[] }) {
  if (tiles.length === 0) return null;
  return (
    <section aria-labelledby="browse-by-type" className="flex flex-col gap-4">
      <h2 id="browse-by-type" className={sectionTitle}>Browse by type</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
        {tiles.map((t) => (
          <li key={t.key}>
            <Link href={t.href} className={`${card} flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lift ${press}`}>
              <span className="block aspect-photo overflow-hidden bg-photo-bg">
                {t.photo && (
                  <Image src={t.photo.src} width={320} height={240} alt="" loading="lazy" className="size-full object-cover" />
                )}
              </span>
              <span className="flex flex-col gap-0.5 p-3">
                <span className="text-body font-medium">{t.label}</span>
                <span className="text-meta text-text-2">{countLabel(t.count)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
