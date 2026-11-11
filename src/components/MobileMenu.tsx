"use client";

import { useCloseAtDesktop } from "@/components/useCloseAtDesktop";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef } from "react";
import { useDemoRole } from "@/lib/demo-role";
import { DASHBOARD_LINK } from "@/lib/nav";
import { PhoneLink } from "@/components/PhoneLink";
import { ChevronDownIcon, CloseIcon, MenuIcon, PhoneIcon } from "@/components/stock/icons";
import { accentButton, closeButton, press } from "@/components/ui";

// Every page within two taps, below 1024px (the header links show from there). A native modal dialog docked to the bottom, in thumb reach,
// with the same slide and scrim as the filter sheet (dialog.sheet in globals.css). The stock comes first as big rows; the rest sits in
// groups that fold open, closed unless they hold the page you are on (docs/mobile-navigation.md).
type Item = { href: string; label: string; long?: string };
export function MobileMenu({ home, primary, groups }: { home: Item; primary: readonly Item[]; groups: readonly { title: string; links: readonly Item[] }[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const path = usePathname();
  // Viewing as the dealer's staff: their dashboard first. Home only away from home.
  const top = [...(useDemoRole() === "dealer" ? [DASHBOARD_LINK] : []), ...(path !== "/" ? [home] : []), ...primary];

  useCloseAtDesktop(() => dialog.current?.close());
  const here = (href: string) => path === href || (href !== "/" && path.startsWith(`${href}/`)); // a car page marks Used cars
  const close = () => {
    dialog.current?.setAttribute("data-instant", "");
    dialog.current?.close();
  };
  // The current page: a thin accent bar in the gutter and accent text. Nothing moves. Closing on the tap, not on a route change: the header
  // stays mounted, so the dialog would otherwise stay open.
  const row = (l: Item, size: string) => (
    <li key={l.href + l.label} className="relative">
      {here(l.href) && <span aria-hidden="true" className="absolute inset-y-3 -left-3 w-[3px] rounded-full bg-accent" />}
      <Link href={l.href} aria-current={here(l.href) ? "page" : undefined} onClick={close} className={`flex items-center ${size} ${here(l.href) ? "text-accent-text" : ""}`}>
        {l.long ?? l.label}
      </Link>
    </li>
  );

  return (
    <>
      <button
        type="button"
        aria-label="Menu"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
        className={`-ml-2 flex h-11 w-11 items-center justify-center rounded-control lg:hidden ${press}`}
      >
        <MenuIcon />
      </button>
      <dialog ref={dialog} className="sheet" aria-labelledby={titleId} onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()} onClose={(e) => e.currentTarget.removeAttribute("data-instant")}>
        <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
          <h2 id={titleId} className="text-heading font-semibold">
            Menu
          </h2>
          <button type="button" aria-label="Close menu" onClick={() => dialog.current?.close()} className={closeButton}>
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-6">
          <nav aria-label="Menu" className="flex flex-col">
            <ul className="flex flex-col pb-2">{top.map((l) => row(l, "min-h-12 text-heading font-semibold"))}</ul>
            {groups.map((g) => (
              <details key={g.title} open={g.links.some((l) => here(l.href))} className="group border-t border-hairline">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-body font-medium [&::-webkit-details-marker]:hidden">
                  {g.title}
                  <ChevronDownIcon className="size-5 text-text-2 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <ul className="flex flex-col pb-2 pl-3">{g.links.map((l) => row(l, "min-h-11 text-body text-text-2"))}</ul>
              </details>
            ))}
          </nav>
          <PhoneLink className={`flex w-full items-center justify-center gap-2 ${accentButton}`}>
            <PhoneIcon className="size-5" />
            Call us
          </PhoneLink>
        </div>
      </dialog>
    </>
  );
}
