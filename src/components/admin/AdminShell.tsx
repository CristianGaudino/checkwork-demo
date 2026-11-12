"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { Density } from "@/components/admin/density";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/stock/icons";
import { press } from "@/components/ui";
import { DENSITY_COOKIE, RAIL_COOKIE, prefCookie, type NavItem } from "@/lib/admin/nav";


// Kept for the next page the server draws (src/app/dashboard/layout.tsx reads the cookies), so nothing jumps after it loads.
const save = (name: string, value: string) => {
  document.cookie = prefCookie(name, value);
};

// The frame of the dealer area (docs/mobile-navigation.md). From 1024px: the whole width of the screen, a sidebar held in place down the
// left on its own surface, folding to a rail of icons and back, and the page beside it. Under 1024px: the dealership's name and the bell on
// top, the page, and a tab bar at the foot of the screen.
export function AdminShell({ title, subtitle, nav, navLabel, openGroups, rail: railAtFirst, compact: compactAtFirst, children }: { title: string; subtitle: string; nav: NavItem[]; navLabel: string; openGroups: string[]; rail: boolean; compact: boolean; children: React.ReactNode }) {
  const [rail, setRail] = useState(railAtFirst);
  const [compact, setCompactNow] = useState(compactAtFirst);
  const setCompact = (v: boolean) => {
    setCompactNow(v);
    save(DENSITY_COOKIE, v ? "compact" : "comfortable");
  };
  const toggleRail = () => {
    setRail(!rail);
    save(RAIL_COOKIE, rail ? "0" : "1");
  };
  const initials = title.split(/\s+/).slice(0, 2).map((w) => w[0]).join("");
  return (
    <Density.Provider value={{ compact, setCompact }}>
      <div data-density={compact ? "compact" : "comfortable"} className={`group/shell flex-1 lg:grid lg:transition-[grid-template-columns] lg:duration-200 lg:ease-out motion-reduce:transition-none ${rail ? "lg:grid-cols-[4.5rem_minmax(0,1fr)]" : "lg:grid-cols-[16rem_minmax(0,1fr)]"}`}>
        <aside className="flex min-w-0 flex-col px-4 pt-4 sm:px-6 lg:sticky lg:top-0 lg:h-[calc(100dvh-var(--demo-bar-h,0px))] lg:self-start lg:overflow-hidden lg:border-r lg:border-hairline lg:bg-rail lg:px-0 lg:pt-0">
          <div className={`flex items-center justify-between gap-2 lg:pb-3 lg:pt-5 ${rail ? "lg:flex-col lg:px-0" : "lg:pl-6 lg:pr-3"}`}>
            <div className={`flex min-w-0 flex-1 items-baseline gap-3 lg:flex-col lg:gap-0 ${rail ? "lg:hidden" : ""}`}>
              <p className="max-w-full truncate text-body font-semibold lg:text-section">{title}</p>
              <p className="text-meta text-text-2">{subtitle}</p>
            </div>
            {/* The rail keeps the dealership as its initials, so the frame still says whose it is. */}
            <span aria-hidden className={`hidden size-10 items-center justify-center rounded-control bg-text font-display text-meta font-semibold text-ink ${rail ? "lg:inline-flex" : ""}`}>
              {initials}
            </span>
            <NotificationBell />
          </div>
          <AdminNav items={nav} label={navLabel} openGroups={openGroups} rail={rail} />
          <div className={`hidden items-center border-t border-hairline lg:mx-3 lg:flex lg:min-h-14 ${rail ? "lg:justify-center" : "lg:justify-between lg:gap-2 lg:pl-3"}`}>
            {!rail && (
              <Link href="/" className="truncate text-meta text-text-2 underline">
                View the public site
              </Link>
            )}
            <button type="button" onClick={toggleRail} aria-label={rail ? "Expand the menu" : "Collapse the menu"} title={rail ? "Expand the menu" : "Collapse the menu"} className={`inline-flex size-11 shrink-0 items-center justify-center rounded-control text-text-2 transition-colors hover:bg-card hover:text-text ${press}`}>
              {rail ? <ChevronRightIcon className="size-5" /> : <ChevronLeftIcon className="size-5" />}
            </button>
          </div>
        </aside>
        {/* On a phone the page ends above the tab bar (3.5rem and the home indicator), so its last row is never under it. */}
        <main className="flex min-w-0 flex-col gap-6 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:px-10 lg:pb-10 lg:pt-0">{children}</main>
      </div>
    </Density.Provider>
  );
}
