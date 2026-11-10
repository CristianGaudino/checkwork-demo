"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/admin/nav";
import { press } from "@/components/ui";

// A row you can swipe on a phone, a column from 1024px. The current section is marked with aria-current and a lifted tile.
export function AdminNav({ items, label }: { items: NavItem[]; label: string }) {
  const path = usePathname();
  // The first item is the area's home, so it matches only itself; the others match their whole branch.
  const current = (i: number, href: string) => (i === 0 ? path === href : path === href || path.startsWith(href + "/"));
  return (
    <nav aria-label={label} className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
      {items.map((it, i) => {
        const on = current(i, it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-control px-3 text-meta font-semibold ${on ? "bg-card text-text shadow-sm" : "text-text-2 hover:text-text"} ${press}`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
