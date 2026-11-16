import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminShell } from "@/components/admin/AdminShell";
import { DEALER_NAV, DENSITY_COOKIE, NAV_COOKIE, RAIL_COOKIE, parseOpenGroups } from "@/lib/admin/nav";
import { currentMember } from "@/lib/permissions";
import { roleCan } from "@/lib/permission-rules";
import { SITE_NAME } from "@/lib/site";
import { stockSource } from "@/lib/stock-source";
import { enabledModules } from "@/lib/modules";
import { pathAllowed } from "@/lib/modules-rules";

// Never indexed. Real access is Cloudflare Access (#7, #21); the demo shows it open so every role can be seen.
// Always rendered per request: these pages show records that change, so they are never built once with the seed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Dealer dashboard", template: "%s | Dealer dashboard" }, robots: { index: false } };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [{ role }, source, jar, modules] = await Promise.all([currentMember(), stockSource(), cookies(), enabledModules()]);
  // A screen that needs a permission is left out of the menu, and the page itself refuses (notFound) without it. So is one for stock kept
  // here, for a dealer whose stock is on DoneDeal, and one of a module the dealer does not have (#173; the proxy refuses its pages).
  const nav = DEALER_NAV.filter((i) => (!i.permission || roleCan(role, i.permission)) && !(i.ours && source === "donedeal") && pathAllowed(i.href, modules) && (!i.module || [i.module].flat().some((m) => modules.has(m))));
  return (
    <AdminShell title={SITE_NAME} subtitle="Dealer dashboard" nav={nav} navLabel="Dealer dashboard" openGroups={parseOpenGroups(jar.get(NAV_COOKIE)?.value)} rail={jar.get(RAIL_COOKIE)?.value === "1"} compact={jar.get(DENSITY_COOKIE)?.value === "compact"}>
      {children}
    </AdminShell>
  );
}
