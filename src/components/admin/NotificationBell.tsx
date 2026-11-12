"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { loadNotices, readNotices } from "@/app/dashboard/notifications/actions";
import { fmtAgo } from "@/lib/admin/format";
import { BellIcon, CalendarIcon, CarIcon, InboxIcon, SyncIcon, TruckIcon, UsersIcon, WrenchIcon } from "@/components/stock/icons";
import { press } from "@/components/ui";

type Data = Awaited<ReturnType<typeof loadNotices>>;
const ICON = { lead: InboxIcon, drive: CalendarIcon, warranty: WrenchIcon, order: TruckIcon, "taken-down": CarIcon, sync: SyncIcon, assigned: UsersIcon } as const;
const POLL_MS = 60_000;

// The bell: what has come in, in the app only. Loaded when the page changes and once a minute, so a new request shows without a reload.
// A native popover, placed under the bell like the row menus (RowMenu.tsx): the browser closes it on Escape or a press outside.
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
      p.style.top = `${b.bottom + 6}px`;
      p.style.left = `${Math.max(8, Math.min(b.left, window.innerWidth - p.offsetWidth - 8))}px`;
      load();
    });
  // Read as soon as it is opened from the list; the link then goes on to it.
  const read = (ids?: string[]) => {
    setData((d) => d && { unread: ids ? d.unread - d.items.filter((n) => n.unread && ids.includes(n.id)).length : 0, items: d.items.map((n) => (!ids || ids.includes(n.id) ? { ...n, unread: false } : n)) });
    readNotices(ids).catch(() => {});
  };
  const unread = data?.unread ?? 0;

  return (
    <>
      <button ref={button} type="button" popoverTarget={id} onClick={place} aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className={`relative inline-flex size-11 shrink-0 items-center justify-center rounded-control text-text-2 transition-colors hover:bg-card hover:text-text ${press}`}>
        <BellIcon className="size-5" />
        {unread > 0 && <span aria-hidden className="absolute right-1.5 top-1.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-bad px-1 text-[0.6875rem] font-semibold leading-none text-on-accent tabular-nums">{unread > 9 ? "9+" : unread}</span>}
      </button>
      <div ref={panel} id={id} popover="auto" aria-label="Notifications" className="fixed inset-auto m-0 w-[min(24rem,calc(100vw-1rem))] flex-col rounded-card border border-hairline bg-card text-text shadow-lift [&:popover-open]:flex">
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
          <h2 className="text-body font-semibold">Notifications</h2>
          {unread > 0 && (
            <button type="button" onClick={() => read()} className="min-h-9 text-meta font-medium text-accent-text underline">
              Mark all as read
            </button>
          )}
        </div>
        {data && data.items.length === 0 ? (
          <p className="px-4 py-8 text-center text-body text-text-2">Nothing yet</p>
        ) : (
          <ul className="flex max-h-[min(28rem,70dvh)] flex-col overflow-y-auto overscroll-contain py-1">
            {data?.items.map((n) => {
              const Icon = ICON[n.kind];
              return (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => {
                      if (n.unread) read([n.id]);
                      panel.current?.hidePopover();
                    }}
                    className={`flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-surface ${n.unread ? "" : "text-text-2"}`}
                  >
                    <Icon className="mt-0.5 size-5 shrink-0 text-text-2" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={`text-body ${n.unread ? "font-medium text-text" : ""}`}>{n.text}</span>
                      <span className="text-meta text-text-2">{fmtAgo(n.at)}</span>
                    </span>
                    {n.unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-accent"><span className="sr-only">Unread</span></span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
