import Link from "next/link";
import { MakeLogo } from "@/components/MakeLogo";
import { press, sectionTitle } from "@/components/ui";
import type { MakeEntry } from "@/lib/stock/makes";

// The makes we have first, with how many, then the makes people look for most, always: each opens its make page, which says what we have
// or offers to find one. "All makes" opens the full list.
export function BrowseByMake({ makes }: { makes: MakeEntry[] }) {
  if (makes.length === 0) return null;
  return (
    <section aria-labelledby="browse-by-make" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h2 id="browse-by-make" className={sectionTitle}>Browse by make</h2>
        <Link href="/makes" className="inline-flex min-h-11 items-center text-meta font-medium underline">
          All makes
        </Link>
      </div>
      <ul className="flex flex-wrap gap-2">
        {makes.map((m) => (
          <li key={m.slug}>
            <Link href={`/makes/${m.slug}`} className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-card px-4 text-meta font-medium transition-colors hover:border-control ${press}`}>
              <MakeLogo slug={m.slug} />
              {m.label}
              {m.count > 0 && <span className="tabular-nums text-text-2">{m.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
