"use client";

import { useCloseAtDesktop } from "@/components/useCloseAtDesktop";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef } from "react";
import { useDemoRole } from "@/lib/demo-role";
import { DASHBOARD_LINK } from "@/lib/nav";
import { PhoneLink } from "@/components/PhoneLink";
import { CloseIcon, MenuIcon, PhoneIcon } from "@/components/stock/icons";
import { accentButton, closeButton, press } from "@/components/ui";

// Every page from one tap, below 1024px (the header links show from there). A native modal dialog docked to the bottom, in
// thumb reach, with the same slide and scrim as the filter sheet (dialog.sheet in globals.css).
type Item = { href: string; label: string };
export function MobileMenu({ home, groups }: { home: Item; groups: readonly { title: string; links: readonly Item[] }[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const path = usePathname();
  // Viewing as the dealer's staff: their dashboard first. Home only away from home.
  const all = [...(useDemoRole() === "dealer" ? [{ title: "", links: [DASHBOARD_LINK] }] : []), ...(path !== "/" ? [{ title: "", links: [home] }] : []), ...groups];

  useCloseAtDesktop(() => dialog.current?.close());
  const here = (href: string) => path === href || (href !== "/" && path.startsWith(`${href}/`)); // a car page marks Used Cars

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
          <nav aria-label="Menu" className="flex flex-col gap-4">
            {all.map((g, gi) => (
              <div key={g.title || gi}>
                {g.title && <h3 className="pb-1 text-meta font-medium text-text-2">{g.title}</h3>}
                <ul>
                  {g.links.map((l) => (
                    <li key={l.href + l.label} className="relative border-b border-hairline last:border-b-0">
                      {/* The current page: a thin accent bar in the gutter and accent text. Nothing moves. */}
                      {here(l.href) && <span aria-hidden="true" className="absolute inset-y-3 -left-3 w-[3px] rounded-full bg-accent" />}
                      {/* Closing here, not on a route change: the header stays mounted, so the dialog would otherwise stay open. */}
                      <Link
                        href={l.href}
                        aria-current={here(l.href) ? "page" : undefined}
                        onClick={() => {
                          dialog.current?.setAttribute("data-instant", "");
                          dialog.current?.close();
                        }}
                        className={`flex min-h-12 items-center text-body font-medium ${here(l.href) ? "text-accent-text" : ""}`}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
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
