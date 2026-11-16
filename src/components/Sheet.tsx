"use client";

import { useId, useRef, useState } from "react";
import { useCloseAtDesktop } from "@/components/useCloseAtDesktop";
import { CloseIcon } from "@/components/stock/icons";
import { closeButton } from "@/components/ui";

// A sheet docked to the bottom of a phone screen, in thumb reach: a native modal dialog with the slide and scrim of dialog.sheet in
// globals.css. `trigger` draws what opens it; a tap on the scrim, the close button or Escape shuts it, and focus goes back to the trigger.
// It closes when the desktop layout takes over, since what opens it is hidden from 1024px.
export function Sheet({ title, closeLabel, trigger, onClose, children }: { title: string; closeLabel: string; trigger: (open: (e: React.MouseEvent<HTMLElement>) => void) => React.ReactNode; onClose?: () => void; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [from, setFrom] = useState<HTMLElement | null>(null); // the trigger, for focus to go back to
  const id = useId();
  const titleId = useId();
  useCloseAtDesktop(() => dialog.current?.close());
  return (
    <>
      {trigger((e) => {
        setFrom(e.currentTarget);
        (document.getElementById(id) as HTMLDialogElement | null)?.showModal();
      })}
      <dialog
        ref={dialog}
        id={id}
        className="sheet"
        aria-labelledby={titleId}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        onClose={(e) => {
          e.currentTarget.removeAttribute("data-instant");
          from?.focus();
          onClose?.();
        }}
      >
        <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
          <h2 id={titleId} className="text-heading font-semibold">
            {title}
          </h2>
          <button type="button" aria-label={closeLabel} onClick={() => dialog.current?.close()} className={closeButton}>
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        {children}
      </dialog>
    </>
  );
}

// A link inside a sheet: the sheet shuts at once, with no slide, since the page is changing under it. Closing on the tap, not on a route
// change: the header stays mounted, so the sheet would otherwise stay open.
export function leaveSheet(e: React.MouseEvent<HTMLElement>) {
  const d = e.currentTarget.closest("dialog");
  d?.setAttribute("data-instant", "");
  d?.close();
}
