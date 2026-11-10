import type { Metadata } from "next";
import { SavedCars } from "@/components/saved/SavedCars";
import { pageMain } from "@/components/ui";
import { PageHeading } from "@/components/PageHeading";

// Each visitor's own list: never indexed and not in the sitemap.
export const metadata: Metadata = { title: "Saved Cars", robots: { index: false } };

export default function SavedPage() {
  return (
    <main className={pageMain}>
      <PageHeading title="Saved Cars" />
      <div className="mt-6 min-h-[28rem]">
        <SavedCars />
      </div>
    </main>
  );
}
