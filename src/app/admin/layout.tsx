import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { DEALER_NAV } from "@/lib/admin/nav";
import { can } from "@/lib/permissions";
import { SITE_NAME } from "@/lib/site";

// Never indexed. Real access is Cloudflare Access (#7, #21); the demo shows it open so every role can be seen.
// Always rendered per request: these pages show records that change, so they are never built once with the seed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Dealer admin", template: "%s | Dealer admin" }, robots: { index: false } };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const margins = await can("margins");
  // A screen that needs a permission is left out of the menu, and the page itself refuses (notFound) without it.
  const nav = DEALER_NAV.filter((i) => i.permission !== "margins" || margins);
  return (
    <AdminShell title={SITE_NAME} subtitle="Dealer admin" nav={nav} navLabel="Dealer admin">
      {children}
    </AdminShell>
  );
}
