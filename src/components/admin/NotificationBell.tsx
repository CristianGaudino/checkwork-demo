"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { loadNotices, readNotices } from "@/app/dashboard/notifications/actions";
import { fmtAgo } from "@/lib/admin/format";
import { BellIcon, CalendarIcon, CarIcon, CloseIcon, InboxIcon, SyncIcon, TruckIcon, UsersIcon, WrenchIcon } from "@/components/stock/icons";
import { press } from "@/components/ui";

type Data = Awaited<ReturnType<typeof loadNotices>>;
const ICON = { lead: InboxIcon, drive: CalendarIcon, warranty: WrenchIcon, order: TruckIcon, "taken-down": CarIcon, sync: SyncIcon, assigned: UsersIcon } as const;
const POLL_MS = 60_000;

// The bell: what has come in, in the app only. Loaded when the page changes and once a minute, so a new request shows without a reload.
// A native popover, placed under the bell like the row menus (RowMenu.tsx) on a desktop and a sheet from the foot of the screen over a
// dimmed page on a phone, like the table filters: the browser closes it on Escape or a press outside. New ones come first, tinted, and
// Earlier below them.
export function NotificationBell() {
  const [data, setData] = useState<Data | null>(null);
  const path = usePathname();
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const load = useCallback(() => {
    loadNotices().then(setData, () => {}); // a missed poll is tried again on the next one
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load, path]);

  const place = () =>
    requestAnimationFrame(() => {
      const p = panel.current;
      const b = button.current?.getBoundingClientRect();
      if (!p || !b || !p.matches(":popover-open")) return;
      const desk = window.matchMedia("(min-width: 640px)").matches;
      p.style.top = desk ? `${b.bottom + 6}px` : "";
      p.style.left = desk ? `${Math.max(8, Math.min(b.left, window.innerWidth - p.offsetWidth - 8))}px` : "";
      load();
    });
  // Read as soon as it is opened from the list; the link then goes on to it.
  const read = (ids?: string[]) => {
    setData((d) => d && { unread: ids ? d.unread - d.items.filter((n) => n.unread && ids.includes(n.id)).length : 0, items: d.items.map((n) => (!ids || ids.includes(n.id) ? { ...n, unread: false } : n)) });
    readNotices(ids).catch(() => {});
  };
  const unread = data?.unread ?? 0;
  const groups = [
    ["New", data?.items.filter((n) => n.unread) ?? []],
    ["Earlier", data?.items.filter((n) => !n.unread) ?? []],
  ] as const;

  return (
    <>
      <button ref={button} type="button" popoverTarget={id} onClick={place} aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className={`relative inline-flex size-11 shrink-0 items-center justify-center rounded-control text-text-2 transition-colors hover:bg-card hover:text-text ${press}`}>
        <BellIcon className="size-5" />
        {unread > 0 && <span aria-hidden className="absolute right-1.5 top-1.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-bad px-1 text-[0.6875rem] font-semibold leading-none text-on-accent tabular-nums">{unread > 9 ? "9+" : unread}</span>}
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        aria-label="Notifications"
        className="fixed m-0 max-h-[85dvh] w-full flex-col overflow-hidden border border-hairline bg-card text-text shadow-lift backdrop:bg-scrim max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:rounded-t-card sm:inset-auto sm:w-[24rem] sm:rounded-card sm:backdrop:bg-transparent [&:popover-open]:flex"
      >
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
          <h2 className="text-body font-semibold">Notifications</h2>
          <span className="flex items-center gap-1">
            {unread > 0 && (
              <button type="button" onClick={() => read()} className="min-h-9 px-2 text-meta font-medium text-accent-text underline">
                Mark all as read
              </button>
            )}
            <button type="button" aria-label="Close the notifications" onClick={() => panel.current?.hidePopover()} className={`inline-flex size-9 items-center justify-center rounded-control text-text-2 hover:text-text ${press}`}>
              <CloseIcon className="size-4" />
            </button>
          </span>
        </div>
        {data && data.items.length === 0 ? (
          <p className="px-4 py-8 text-center text-body text-text-2">Nothing yet</p>
        ) : (
          <div className="flex max-h-[min(32rem,75dvh)] flex-col overflow-y-auto overscroll-contain pb-2">
            {groups.map(([title, items]) =>
              items.length === 0 ? null : (
                <section key={title} aria-label={title}>
                  <h3 className="sticky top-0 z-10 bg-card px-4 pb-1 pt-3 text-meta font-semibold text-text-2">{title}</h3>
                  <ul className="flex flex-col">
                    {items.map((n) => {
                      const Icon = ICON[n.kind];
                      return (
                        <li key={n.id}>
                          <Link
                            href={n.href}
                            onClick={() => {
                              if (n.unread) read([n.id]);
                              panel.current?.hidePopover();
                            }}
                            className={`relative flex items-start gap-3 px-4 py-3 transition-colors ${n.unread ? "bg-info-soft/60 hover:bg-info-soft" : "text-text-2 hover:bg-surface"}`}
                          >
                            {n.unread && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-accent" />}
                            <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full ${n.unread ? "bg-card text-accent-text" : "bg-surface text-text-2"}`}>
                              <Icon className="size-4" />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className={`text-body ${n.unread ? "font-semibold text-text" : ""}`}>{n.text}</span>
                              <span className="text-meta text-text-2">{fmtAgo(n.at)}</span>
                            </span>
                            {n.unread && <span className="sr-only">Unread</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ),
            )}
          </div>
        )}
      </div>
    </>
  );
}
