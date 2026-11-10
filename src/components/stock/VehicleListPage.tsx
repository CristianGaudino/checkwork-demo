import { MakeLogo } from "@/components/MakeLogo";
import Link from "next/link";
import { ListingCard } from "@/components/stock/ListingCard";
import { EmptyNote } from "@/components/stock/EmptyNote";
import { eyebrow, pageMain, pageTitle, press } from "@/components/ui";
import { VEHICLE_TYPES } from "@/lib/nav";
import { PARTNERS } from "@/lib/partners";
import { queryAllOrNull } from "@/lib/stock";
import type { Condition } from "@/lib/stock/types";
import { CONNECTION_ERROR } from "@/lib/copy";

// The page for new cars and for commercial vehicles: a heading, the makes as links, and the cars as a grid. Used cars keep their own
// page with its filters. The make filter lives in the URL (?make=), and an unknown make shows everything.
export async function VehicleListPage({ condition, make }: { condition: Exclude<Condition, "used">; make?: string }) {
  const type = VEHICLE_TYPES.find((t) => t.condition === condition)!;
  const result = await queryAllOrNull({ condition });
  const all = result?.cars ?? [];
  const makes = [...new Map(all.map((c) => [c.makeSlug, c.make])).entries()].map(([slug, label]) => ({ slug, label, count: all.filter((c) => c.makeSlug === slug).length }));
  // Our franchise brands come first on the new cars page, in the order we list them.
  const rank = (slug: string) => (condition === "new" ? PARTNERS.findIndex((p) => p.slug === slug) : -1);
  makes.sort((a, b) => (rank(a.slug) < 0 ? 99 : rank(a.slug)) - (rank(b.slug) < 0 ? 99 : rank(b.slug)) || a.label.localeCompare(b.label, "en-IE"));
  const chosen = makes.some((m) => m.slug === make) ? make : undefined;
  const cars = chosen ? all.filter((c) => c.makeSlug === chosen) : all;

  return (
    <main className={pageMain}>
      <p className={eyebrow}>{type.label}</p>
      <h1 className={`mt-1 ${pageTitle}`}>{type.title}</h1>
      <p className="mt-2 max-w-measure text-body text-text-2">{type.intro}</p>

      {makes.length > 0 && (
        <nav aria-label="Makes" className="scrollbar-none -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {[{ slug: "", label: "All makes", count: all.length }, ...makes].map((m) => (
            <Link
              key={m.slug || "all"}
              href={m.slug ? `${type.href}?make=${m.slug}` : type.href}
              aria-current={(m.slug || undefined) === chosen ? "true" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-meta font-semibold ${(m.slug || undefined) === chosen ? "border-accent bg-accent text-on-accent" : "border-control bg-card"} ${press}`}
            >
              <MakeLogo slug={m.slug} className={`size-4 ${(m.slug || undefined) === chosen ? "brightness-0 invert" : ""}`} />
              {m.label}
              <span className="tabular-nums font-normal">{m.count}</span>
            </Link>
          ))}
        </nav>
      )}

      {!result ? (
        <EmptyNote title="We couldn't load the cars" text={CONNECTION_ERROR} />
      ) : cars.length === 0 ? (
        <EmptyNote title={`No ${type.label.toLowerCase()} vehicles right now`} text="Tell us what you are looking for and we will find it." href="/find-a-car" action="Find a car for me" />
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {cars.map((car, i) => (
            <li key={car.id} className="min-w-0">
              <ListingCard car={car} priority={i < 2} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
