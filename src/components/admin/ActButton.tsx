"use client";

import { useId, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/toast";
import { adminButtonQuiet, dangerButton as danger } from "./kit";

export type Confirm = { title: string; text?: string; yes: string };

// One dashboard button that runs a server action. Two safety nets, chosen per button:
// - `confirm`: something that cannot be taken back (a delete, a send) asks first, in a native modal dialog. Escape or Cancel does nothing.
// - `done` and `undo`: something that can be taken back runs at once and says so in the toast, with Undo when `undo` is given.
// An action that redirects (a delete that leaves the page) goes there itself; the toast is for the actions that stay.
export function ActButton({ act, undo, done, confirm, label, className, children }: { act: () => Promise<unknown>; undo?: () => Promise<unknown>; done?: string; confirm?: Confirm; label?: string; className: string; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const run = () =>
    start(async () => {
      await act();
      router.refresh();
      if (done) showToast(done, undo && (() => start(async () => void (await undo(), router.refresh()))));
    });
  return (
    <>
      <button type="button" aria-label={label} disabled={pending} aria-busy={pending || undefined} onClick={() => (confirm ? dialog.current?.showModal() : run())} className={className}>
        {children}
      </button>
      {confirm && (
        <dialog ref={dialog} aria-labelledby={titleId} className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-card bg-card p-5 text-text shadow-lift backdrop:bg-black/50">
          <h2 id={titleId} className="text-heading font-semibold">{confirm.title}</h2>
          {confirm.text && <p className="mt-2 text-body text-text-2">{confirm.text}</p>}
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button type="button" autoFocus onClick={() => dialog.current?.close()} className={adminButtonQuiet}>Cancel</button>
            <button type="button" onClick={() => (dialog.current?.close(), run())} className={danger}>{confirm.yes}</button>
          </div>
        </dialog>
      )}
    </>
  );
}
