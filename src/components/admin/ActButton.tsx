"use client";

import { useId, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/toast";
import { adminButtonQuiet, choicePill, dangerButton as danger } from "./kit";

export type Confirm = { title: string; text?: string; yes: string };

// One dashboard button that runs a server action. Two safety nets, chosen per button:
// - `confirm`: something that cannot be taken back (a delete, a send) asks first, in a native modal dialog. Escape or Cancel does nothing.
// - `done` and `undo`: something that can be taken back runs at once and says so in the toast, with Undo when `undo` is given.
// An action that redirects (a delete that leaves the page) goes there itself; the toast is for the actions that stay.
// The dialog is made when asked for, in the page's body, so a button inside a menu that closes (RowMenu) can still ask.
// `pressed`: the button is one choice of a few (a status, who has it) and this is the one now; choosing it again does nothing.
export function ActButton({ act, undo, done, confirm, label, pressed, className, children }: { act: () => Promise<unknown>; undo?: () => Promise<unknown>; done?: string; confirm?: Confirm; label?: string; pressed?: boolean; className: string; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const titleId = useId();
  const run = () =>
    start(async () => {
      await act();
      router.refresh();
      if (done) showToast(done, undo && (() => start(async () => void (await undo(), router.refresh()))));
    });
  return (
    <>
      <button type="button" aria-label={label} aria-pressed={pressed} disabled={pending} aria-busy={pending || undefined} onClick={() => (pressed ? undefined : confirm ? setAsking(true) : run())} className={className}>
        {children}
      </button>
      {confirm &&
        asking &&
        createPortal(
          <dialog ref={(d) => void (d && !d.open && d.showModal())} onClose={() => setAsking(false)} aria-labelledby={titleId} className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-card bg-card p-5 text-text shadow-lift backdrop:bg-black/50">
            <h2 id={titleId} className="text-heading font-semibold">{confirm.title}</h2>
            {confirm.text && <p className="mt-2 text-body text-text-2">{confirm.text}</p>}
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button type="button" autoFocus onClick={() => setAsking(false)} className={adminButtonQuiet}>Cancel</button>
              <button type="button" onClick={() => (setAsking(false), run())} className={danger}>{confirm.yes}</button>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}

// One of a few choices (a status, who has it, a follow-up) that posts a form action, with Undo: `set` is what this choice sends, `back` what
// puts it back as it was (left out when there is no way back). The action checks every value, as it does for a form.
const formOf = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
export function ChoiceAct({ action, set, back, active, done, confirm, className, children }: { action: (data: FormData) => Promise<unknown>; set: Record<string, string>; back?: Record<string, string>; active: boolean; done: string; confirm?: Confirm; className?: string; children: React.ReactNode }) {
  return (
    <ActButton act={() => action(formOf(set))} undo={back && (() => action(formOf(back)))} done={done} confirm={confirm} pressed={className ? undefined : active} className={className ?? choicePill(active)}>
      {children}
    </ActButton>
  );
}
