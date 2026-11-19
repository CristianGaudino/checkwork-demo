import type { Metadata } from "next";
import { CompareCards, CompareUnitToggle } from "@/components/compare/CompareCards";
import { pageMain } from "@/components/ui";
import { PageHeading } from "@/components/PageHeading";

// Each visitor's own list: never indexed and not in the sitemap.
export const metadata: Metadata = { title: "Compare cars", robots: { index: false } };

export default function ComparePage() {
  return (
    <main className={pageMain}>
      <PageHeading title="Compare cars" intro="Compare up to three cars side by side." actions={<CompareUnitToggle />} />
      <div className="mt-6 min-h-[28rem]">
        <CompareCards />
      </div>
    </main>
  );
}
