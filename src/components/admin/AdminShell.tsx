import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import type { NavItem } from "@/lib/admin/nav";

// The frame of the dealer area: a calm sidebar on a desktop, a tab bar at the foot of the screen on a phone (docs/mobile-navigation.md),
// and a top line with who you are. The pages inside are server components; nothing here knows what they show.
export function AdminShell({ title, subtitle, nav, navLabel, children }: { title: string; subtitle: string; nav: NavItem[]; navLabel: string; children: React.ReactNode }) {
  return (
    // On a phone the page ends above the tab bar (3.5rem and the home indicator), so its last row is never under it.
    <div className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 content-start gap-4 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:py-8">
      <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <div className="flex items-baseline justify-between gap-3 lg:flex-col lg:items-start lg:gap-0">
          <p className="text-body font-semibold lg:text-heading">{title}</p>
          <p className="text-meta text-text-2">{subtitle}</p>
        </div>
        <AdminNav items={nav} label={navLabel} />
        <Link href="/" className="hidden min-h-11 items-center text-meta text-text-2 underline lg:flex">
          View the public site
        </Link>
      </aside>
      <main className="flex min-w-0 flex-col gap-6">{children}</main>
    </div>
  );
}
