import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import type { NavItem } from "@/lib/admin/nav";

// The frame of the dealer and platform areas: a calm sidebar on a desktop, a swipe row on a phone, a top line with who you are.
// The pages inside are server components; nothing here knows what they show.
export function AdminShell({ title, subtitle, nav, navLabel, children }: { title: string; subtitle: string; nav: NavItem[]; navLabel: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 content-start gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:py-8">
      <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-start lg:gap-0">
          <p className="text-heading font-bold">{title}</p>
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
