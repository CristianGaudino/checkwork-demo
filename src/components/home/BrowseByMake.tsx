import Link from "next/link";
import { MakeLogo } from "@/components/MakeLogo";
import { press, sectionTitle } from "@/components/ui";
import type { MakeEntry } from "@/lib/stock/makes";
import { MakeRows } from "./MakeRows";

// The makes we have, busiest first, with how many: each opens its make page. "All makes" opens the full list, the makes we do not have
// among them. Two rows that scroll sideways together (MakeRows): the makes alternate
// between them (first, third, fifth on top), so the busiest lead both, and the pills' own widths stagger the rows. The edges fade.
export function BrowseByMake({ makes }: { makes: MakeEntry[] }) {
  if (makes.length === 0) return null;
  const pill = (m: MakeEntry) => (
    <li key={m.slug} className="shrink-0">
      <Link href={`/makes/${m.slug}`} className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border border-hairline bg-card px-4 text-meta font-medium hover:border-control ${press}`}>
        <MakeLogo slug={m.slug} />
        {m.label}
        <span className="tabular-nums text-text-2">{m.count}</span>
      </Link>
    </li>
  );
  const rows = [makes.filter((_, i) => i % 2 === 0), makes.filter((_, i) => i % 2 === 1)].filter((r) => r.length > 0); // one make: one row
  return (
    <section aria-labelledby="browse-by-make" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h2 id="browse-by-make" className={sectionTitle}>Browse by make</h2>
        <Link href="/makes" className="inline-flex min-h-11 items-center text-meta font-medium underline">
          All makes
        </Link>
      </div>
      <MakeRows
        label="Makes"
        rows={rows.map((r, i) => (
          // w-max: each row is as wide as its pills, so both scroll together as one.
          <ul key={i} className="flex w-max gap-2">
            {r.map(pill)}
          </ul>
        ))}
      />
    </section>
  );
}
