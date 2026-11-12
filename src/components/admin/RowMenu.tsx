"use client";

import { useId, useRef } from "react";
import { ChevronDownIcon } from "@/components/stock/icons";
import { rowButton } from "./kit";

// A row's less used actions, behind More, so a table row keeps one or two buttons and fits its width. A native popover: it sits above the
// page (a table's scroll box cannot clip it), and the browser closes it on Escape or a press outside, returning focus to More. Placed
// under the button, right edges level (above it near the bottom of the screen), and closed on scroll so it never floats from its row.
export function RowMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  // Runs on the press, before the browser opens it; the next frame, once it has a size, it is put in place.
  const place = () =>
    requestAnimationFrame(() => {
      const m = menu.current;
      const b = button.current?.getBoundingClientRect();
      if (!m || !b || !m.matches(":popover-open")) return;
      const below = b.bottom + 4 + m.offsetHeight <= window.innerHeight - 8;
      m.style.top = `${below ? b.bottom + 4 : Math.max(8, b.top - 4 - m.offsetHeight)}px`;
      m.style.left = `${Math.max(8, b.right - m.offsetWidth)}px`;
      window.addEventListener("scroll", () => m.matches(":popover-open") && m.hidePopover(), { capture: true, once: true });
    });
  return (
    <>
      <button ref={button} type="button" popoverTarget={id} onClick={place} aria-label={label} className={rowButton}>
        More
        <ChevronDownIcon className="size-4" />
      </button>
      {/* An item closes the menu when chosen: a link navigates, a button runs (and asks first, in its own dialog, if it must). */}
      <div
        ref={menu}
        id={id}
        popover="auto"
        onClick={(e) => (e.target as HTMLElement).closest("a,button") && menu.current?.hidePopover()}
        className="fixed inset-auto m-0 min-w-44 flex-col gap-1 rounded-control border border-hairline bg-card p-1 text-text shadow-lift [&:popover-open]:flex *:w-full *:justify-start *:border-0"
      >
        {children}
      </div>
    </>
  );
}
