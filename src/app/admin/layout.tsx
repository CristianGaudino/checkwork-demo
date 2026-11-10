import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { DEALER_NAV } from "@/lib/admin/nav";
import { SITE_NAME } from "@/lib/site";

// Never indexed. Real access is Cloudflare Access (#7, #21); the demo shows it open so every role can be seen.
// Always rendered per request: these pages show records that change, so they are never built once with the seed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Dealer admin", template: "%s | Dealer admin" }, robots: { index: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell title={SITE_NAME} subtitle="Dealer admin" nav={DEALER_NAV} navLabel="Dealer admin">
      {children}
    </AdminShell>
  );
}
