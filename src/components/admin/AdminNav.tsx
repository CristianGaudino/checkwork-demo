"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavIcon, NavItem } from "@/lib/admin/nav";
import { CalendarIcon, CarIcon, ChartIcon, CogIcon, HistoryIcon, HomeIcon, InboxIcon, MegaphoneIcon, PercentIcon, StarIcon, UsersIcon } from "@/components/stock/icons";
import { press } from "@/components/ui";

const ICONS: Record<NavIcon, typeof HomeIcon> = { home: HomeIcon, inbox: InboxIcon, car: CarIcon, calendar: CalendarIcon, users: UsersIcon, megaphone: MegaphoneIcon, chart: ChartIcon, percent: PercentIcon, star: StarIcon, cog: CogIcon, history: HistoryIcon };

// A row you can swipe on a phone; from 1024px a column in groups, each with a small heading. The current section is filled.
export function AdminNav({ items, label }: { items: NavItem[]; label: string }) {
  const path = usePathname();
  // The first item is the area's home, so it matches only itself; the others match their whole branch.
  const current = (i: number, href: string) => (i === 0 ? path === href : path === href || path.startsWith(href + "/"));
  return (
    <nav aria-label={label} className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
      {items.map((it, i) => {
        const on = current(i, it.href);
        const Icon = ICONS[it.icon];
        return (
          <div key={it.href} className="contents">
            {it.group && <p className="hidden px-3 pb-1 pt-5 text-meta text-text-2 lg:block">{it.group}</p>}
            <Link
              href={it.href}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-3 whitespace-nowrap rounded-control px-3 text-body font-medium transition-colors ${on ? "bg-accent text-on-accent" : "text-text-2 hover:bg-card hover:text-text"} ${press}`}
            >
              <Icon className="size-5 shrink-0" />
              {it.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
