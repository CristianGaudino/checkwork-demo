import type { Metadata } from "next";
import { CompareCards } from "@/components/compare/CompareCards";
import { pageMain } from "@/components/ui";
import { PageHeading } from "@/components/PageHeading";
import { UnitToggle } from "@/components/UnitToggle";

// Each visitor's own list: never indexed and not in the sitemap.
export const metadata: Metadata = { title: "Compare cars", robots: { index: false } };

export default function ComparePage() {
  return (
    <main className={pageMain}>
      <PageHeading title="Compare cars" intro="Compare up to three cars side by side." actions={<UnitToggle className="self-start" />} />
      <div className="mt-6 min-h-[28rem]">
        <CompareCards />
      </div>
    </main>
  );
}
