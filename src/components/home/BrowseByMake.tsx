import Link from "next/link";
import { press, sectionTitle } from "@/components/ui";

type Option = { slug: string; label: string };

// The makes in stock, as links to each make's page.
export function BrowseByMake({ makes }: { makes: Option[] }) {
  if (makes.length === 0) return null;
  return (
    <section aria-labelledby="browse-by-make" className="flex flex-col gap-4">
      <h2 id="browse-by-make" className={sectionTitle}>Browse by Make</h2>
      <ul className="flex flex-wrap gap-2">
        {makes.map((m) => (
          <li key={m.slug}>
            <Link href={`/used-cars/${m.slug}`} className={`inline-flex min-h-11 items-center rounded-full bg-card px-5 text-meta font-semibold shadow-sm ${press}`}>
              {m.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
