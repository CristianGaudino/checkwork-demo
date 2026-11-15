"use client";

import { useEffect, type RefObject } from "react";

export const LEAVE_QUESTION = "Leave without saving? Your changes will be lost.";

// What the form holds now, as text, to compare with how it opened. Every control counts, the dashboard's own dropdowns too (they keep
// their value in a hidden input, which fires no input event).
const snapshot = (el: HTMLFormElement) => JSON.stringify([...new FormData(el)].map(([k, v]) => [k, typeof v === "string" ? v : v.name]));

// Asks before a form with changes is left: a reload or closed tab gets the browser's own question, a tap on a link in the site gets ours
// (a client navigation never fires beforeunload). Changed means different from how it opened, so an edit put back counts as none. A save
// that works moves to another page, which ends this. Back and forward are not asked: the app router has no way to hold them.
export function useLeaveGuard(form: RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    const el = form.current;
    if (!el) return;
    const opened = snapshot(el);
    const changed = () => snapshot(el) !== opened;
    const unload = (e: BeforeUnloadEvent) => {
      if (changed()) e.preventDefault();
    };
    // Capture, on the document: runs before Next's Link handler, so a No stops the navigation.
    const click = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const to = new URL(a.href);
      // Another site unloads this page (beforeunload asks); a #link on this page leaves nothing.
      if (to.origin !== location.origin || (to.pathname === location.pathname && to.search === location.search)) return;
      if (!changed() || window.confirm(LEAVE_QUESTION)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [form]);
}
