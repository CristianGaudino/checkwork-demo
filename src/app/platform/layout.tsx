import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { PLATFORM_NAV } from "@/lib/admin/nav";

// Always rendered per request: these pages show records that change, so they are never built once with the seed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Platform", template: "%s | Platform" }, robots: { index: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell title="Checkwork" subtitle="Platform" nav={PLATFORM_NAV} navLabel="Platform">
      {children}
    </AdminShell>
  );
}
