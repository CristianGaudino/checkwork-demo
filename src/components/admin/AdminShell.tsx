import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import type { NavItem } from "@/lib/admin/nav";

// The frame of the dealer area (docs/mobile-navigation.md). From 1024px: the whole width of the screen, a sidebar held in place down the
// left at the height of the screen (above the demo bar), its menu scrolling on its own if it ever needs to, and the page beside it. Under
// 1024px: the dealership's name on top, the page, and a tab bar at the foot of the screen. The pages inside are server components.
export function AdminShell({ title, subtitle, nav, navLabel, openGroups, children }: { title: string; subtitle: string; nav: NavItem[]; navLabel: string; openGroups: string[]; children: React.ReactNode }) {
  return (
    <div className="flex-1 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="flex min-w-0 flex-col px-4 pt-4 sm:px-6 lg:sticky lg:top-0 lg:h-[calc(100dvh-var(--demo-bar-h,0px))] lg:self-start lg:border-r lg:border-hairline lg:px-0 lg:pt-0">
        <div className="flex items-baseline justify-between gap-3 lg:flex-col lg:items-start lg:gap-0 lg:px-6 lg:pb-4 lg:pt-7">
          <p className="text-body font-semibold lg:text-heading">{title}</p>
          <p className="text-meta text-text-2">{subtitle}</p>
        </div>
        <AdminNav items={nav} label={navLabel} openGroups={openGroups} />
        <Link href="/" className="mx-3 hidden min-h-12 items-center border-t border-hairline px-3 text-meta text-text-2 underline lg:flex">
          View the public site
        </Link>
      </aside>
      {/* On a phone the page ends above the tab bar (3.5rem and the home indicator), so its last row is never under it. */}
      <main className="flex min-w-0 flex-col gap-6 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}
