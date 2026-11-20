import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { accentButton, messagePage, pageTitle } from "@/components/ui";
import { demoCookiesCount } from "@/lib/demo";
import { MODULES } from "@/lib/modules-rules";
import { hasModule } from "@/lib/modules";

export const metadata: Metadata = { title: "Not in this plan", robots: { index: false } };

// Where the proxy sends a public page whose module is off, only while the demo bar's Plan switch decides the modules (src/proxy.ts). A real
// client site never advertises a module it lacks: there this is a 404 like any other.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = MODULES.find((x) => x.id === id);
  if (!m || !demoCookiesCount() || (await hasModule(m.id))) notFound();
  return (
    <main className={messagePage}>
      <h1 className={pageTitle}>Not in this plan</h1>
      <p className="mt-4 max-w-measure text-body text-text-2">
        <span className="font-semibold text-text">{m.label}</span>: {m.blurb}
      </p>
      <Link href="/used-cars" className={`mt-6 inline-flex items-center ${accentButton}`}>
        See all used cars
      </Link>
    </main>
  );
}
