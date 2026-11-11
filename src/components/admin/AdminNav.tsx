"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef } from "react";
import type { NavIcon, NavItem } from "@/lib/admin/nav";
import { useCloseAtDesktop } from "@/components/useCloseAtDesktop";
import { CalendarIcon, CarIcon, ChartIcon, CloseIcon, CogIcon, HistoryIcon, ReportIcon, ShieldCheckIcon, HomeIcon, InboxIcon, MegaphoneIcon, MenuIcon, PercentIcon, StarIcon, UsersIcon } from "@/components/stock/icons";
import { closeButton, press } from "@/components/ui";

const ICONS: Record<NavIcon, typeof HomeIcon> = { home: HomeIcon, inbox: InboxIcon, car: CarIcon, calendar: CalendarIcon, users: UsersIcon, megaphone: MegaphoneIcon, chart: ChartIcon, percent: PercentIcon, star: StarIcon, cog: CogIcon, history: HistoryIcon, report: ReportIcon, shield: ShieldCheckIcon };

// The four places staff go all day: the tab bar on a phone shows these, and More opens the rest.
const TABS = ["/dashboard", "/dashboard/leads", "/dashboard/test-drives", "/dashboard/stock"];

// The dealer area's navigation. From 1024px a sidebar in groups, each with a small heading; under 1024px a tab bar at the foot of the
// screen (docs/mobile-navigation.md). The current section is marked in both.
export function AdminNav({ items, label }: { items: NavItem[]; label: string }) {
  const path = usePathname();
  // The first item is the area's home, so it matches only itself; the others match their whole branch.
  const current = (href: string) => (href === items[0]?.href ? path === href : path === href || path.startsWith(href + "/"));
  return (
    <>
      <nav aria-label={label} className="hidden flex-col gap-0.5 lg:flex">
        {items.map((it) => {
          const on = current(it.href);
          const Icon = ICONS[it.icon];
          return (
            <div key={it.href} className="contents">
              {it.group && <p className="px-3 pb-1 pt-5 text-meta text-text-2">{it.group}</p>}
              <Link
                href={it.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 whitespace-nowrap rounded-control px-3 text-body font-medium transition-colors ${on ? "bg-accent text-on-accent" : "text-text-2 hover:bg-card hover:text-text"} ${press}`}
              >
                <Icon className="size-5 shrink-0" />
                {it.label}
              </Link>
            </div>
          );
        })}
      </nav>
      <TabBar items={items} label={label} current={current} />
    </>
  );
}

// Under 1024px: the four main places as tabs, and More. More is marked when the page you are on is one of its own.
function TabBar({ items, label, current }: { items: NavItem[]; label: string; current: (href: string) => boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useCloseAtDesktop(() => dialog.current?.close());
  const tabs = items.filter((i) => TABS.includes(i.href));
  // Each item under its sidebar group (an item names its group only when it starts one), so More shows the same headings.
  const more = items.map((it, i) => ({ ...it, section: items.slice(0, i + 1).findLast((x) => x.group)?.group ?? "" })).filter((i) => !TABS.includes(i.href));
  const inMore = more.some((i) => current(i.href));
  const tab = (on: boolean) => `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.75rem] font-medium leading-tight ${on ? "text-accent-text" : "text-text-2"} ${press}`;
  const close = () => {
    dialog.current?.setAttribute("data-instant", "");
    dialog.current?.close();
  };
  return (
    <>
      <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl reduce-transparency:bg-surface reduce-transparency:backdrop-blur-none lg:hidden">
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {tabs.map((it) => {
            const Icon = ICONS[it.icon];
            const on = current(it.href);
            return (
              <li key={it.href}>
                <Link href={it.href} aria-current={on ? "page" : undefined} className={tab(on)}>
                  <Icon className="size-6" />
                  {it.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" aria-haspopup="dialog" aria-current={inMore ? "page" : undefined} onClick={() => dialog.current?.showModal()} className={`w-full ${tab(inMore)}`}>
              <MenuIcon className="size-6" />
              More
            </button>
          </li>
        </ul>
      </nav>
      <dialog ref={dialog} className="sheet" aria-labelledby={titleId} onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()} onClose={(e) => e.currentTarget.removeAttribute("data-instant")}>
        <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
          <h2 id={titleId} className="text-heading font-semibold">
            More
          </h2>
          <button type="button" aria-label="Close" onClick={() => dialog.current?.close()} className={closeButton}>
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        <nav aria-label="More" className="flex flex-col overflow-y-auto px-4 pb-6">
          {more.map((it, i) => {
            const Icon = ICONS[it.icon];
            const on = current(it.href);
            return (
              <div key={it.href} className="contents">
                {it.section !== more[i - 1]?.section && <p className={`pb-1 text-meta text-text-2 ${i ? "pt-4" : ""}`}>{it.section}</p>}
                <Link href={it.href} aria-current={on ? "page" : undefined} onClick={close} className={`flex min-h-12 items-center gap-3 text-body font-medium ${on ? "text-accent-text" : ""}`}>
                  <Icon className="size-5 shrink-0 text-text-2" />
                  {it.label}
                </Link>
              </div>
            );
          })}
          <Link href="/" onClick={close} className="mt-4 flex min-h-12 items-center border-t border-hairline text-body text-text-2 underline">
            View the public site
          </Link>
        </nav>
      </dialog>
    </>
  );
}
