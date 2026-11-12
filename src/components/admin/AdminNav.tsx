"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { navGroups, openGroupsCookie, type NavGroup, type NavIcon, type NavItem } from "@/lib/admin/nav";
import { useCloseAtDesktop } from "@/components/useCloseAtDesktop";
import { CalendarIcon, CarIcon, ChartIcon, ChevronDownIcon, CloseIcon, CogIcon, HistoryIcon, ReportIcon, ShieldCheckIcon, TruckIcon, WrenchIcon, HomeIcon, InboxIcon, MegaphoneIcon, MenuIcon, PercentIcon, StarIcon, UsersIcon } from "@/components/stock/icons";
import { closeButton, press } from "@/components/ui";

const ICONS: Record<NavIcon, typeof HomeIcon> = { home: HomeIcon, inbox: InboxIcon, car: CarIcon, calendar: CalendarIcon, users: UsersIcon, megaphone: MegaphoneIcon, chart: ChartIcon, percent: PercentIcon, star: StarIcon, cog: CogIcon, history: HistoryIcon, report: ReportIcon, shield: ShieldCheckIcon, wrench: WrenchIcon, truck: TruckIcon };

// The four places staff go all day: the tab bar on a phone shows these, and More opens the rest.
const TABS = ["/dashboard", "/dashboard/leads", "/dashboard/test-drives", "/dashboard/stock"];

const OPEN_MS = 200; // the groups' ease, duration-200 below

// Kept for the next page the server draws (src/app/dashboard/layout.tsx reads it).
const saveOpenGroups = (open: string[]) => {
  document.cookie = openGroupsCookie(open);
};

// The dealer area's navigation (docs/mobile-navigation.md). From 1024px a sidebar: Overview, then the groups, each folding open and shut
// under its heading. Under 1024px a tab bar at the foot of the screen. The current section is marked in both.
export function AdminNav({ items, label, openGroups }: { items: NavItem[]; label: string; openGroups: string[] }) {
  const path = usePathname();
  // The first item is the area's home, so it matches only itself; the others match their whole branch.
  const current = (href: string) => (href === items[0]?.href ? path === href : path === href || path.startsWith(href + "/"));
  const { top, groups } = navGroups(items);
  const here = groups.find((g) => g.items.some((i) => current(i.href)))?.name;
  // Open: the groups the person left open (the cookie), and the one holding the page they are on. Arriving in a closed group opens it,
  // set while rendering (not in an effect), so it is never drawn shut first.
  const [open, setOpen] = useState(() => new Set(here ? [...openGroups, here] : openGroups));
  const [seen, setSeen] = useState(here);
  if (here !== seen) {
    setSeen(here);
    if (here && !open.has(here)) setOpen(new Set([...open, here]));
  }
  const toggle = (name: string) => {
    const next = new Set(open);
    if (!next.delete(name)) next.add(name);
    setOpen(next);
    saveOpenGroups([...next]);
  };
  // The page you are on is always in view in the menu, even when every group is open on a short screen. Once its group has eased open
  // (OPEN_MS), so the place is measured where the link ends up.
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const t = setTimeout(() => nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" }), OPEN_MS + 20);
    return () => clearTimeout(t);
  }, [path]);
  return (
    <>
      <nav ref={nav} aria-label={label} className="hidden min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-3 pb-4 lg:flex">
        {top.map((it) => (
          <NavLink key={it.href} item={it} on={current(it.href)} />
        ))}
        {groups.map((g) => (
          <NavSection key={g.name} group={g} open={open.has(g.name)} holdsCurrent={g.name === here} onToggle={() => toggle(g.name)} current={current} />
        ))}
      </nav>
      <TabBar items={items} label={label} current={current} />
    </>
  );
}

function NavLink({ item, on }: { item: NavItem; on: boolean }) {
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      aria-current={on ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 whitespace-nowrap rounded-control px-3 text-body font-medium transition-colors ${on ? "bg-accent text-on-accent" : "text-text-2 hover:bg-card hover:text-text"} ${press}`}
    >
      <Icon className="size-5 shrink-0" />
      {item.label}
    </Link>
  );
}

// A heading that opens and shuts its group. Shut, its links are invisible (out of the tab order and hidden from screen readers; visibility
// flips at the end of the closing ease, so they show while it plays), and a dot on the heading says the page you are on is inside. The height
// eases open, and does not move for someone who asked for less motion.
function NavSection({ group, open, holdsCurrent, onToggle, current }: { group: NavGroup; open: boolean; holdsCurrent: boolean; onToggle: () => void; current: (href: string) => boolean }) {
  const id = useId();
  return (
    <div className="flex flex-col pt-3">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle} className={`flex min-h-9 items-center gap-2 rounded-control px-3 text-meta font-medium text-text-2 transition-colors hover:text-text ${press}`}>
        {group.name}
        {holdsCurrent && !open && <span aria-hidden className="size-1.5 rounded-full bg-accent" />}
        <ChevronDownIcon aria-hidden className={`ml-auto size-4 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>
      <div id={id} className={`grid transition-[grid-template-rows,visibility] duration-200 ease-out motion-reduce:transition-none ${open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"}`}>
        <div className="flex min-h-0 flex-col gap-0.5 overflow-hidden">
          {group.items.map((it) => (
            <NavLink key={it.href} item={it} on={current(it.href)} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Under 1024px: the four main places as tabs, and More. More is marked when the page you are on is one of its own.
function TabBar({ items, label, current }: { items: NavItem[]; label: string; current: (href: string) => boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useCloseAtDesktop(() => dialog.current?.close());
  const tabs = items.filter((i) => TABS.includes(i.href));
  // Each item under its sidebar group, so More shows the same headings.
  const more = items.map((it) => ({ ...it, section: it.group ?? "" })).filter((i) => !TABS.includes(i.href));
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
