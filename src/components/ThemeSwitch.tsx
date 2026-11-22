"use client";

import { useId, useSyncExternalStore } from "react";
import { THEMES, THEME_KEY, themeChoice, type Theme } from "@/lib/demo";

// The one theme store, for the footer. Auto is no stored value: THEME_SCRIPT in the head then follows the device.
// The choice is also kept on <html> (data-theme-choice), so it holds for this page view when storage is blocked, and the head script reads
// it before following a change of the device's theme. A choice made in another tab arrives as a storage event.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  addEventListener("storage", cb); // after the head script's own listener, which has applied it by then
  return () => {
    listeners.delete(cb);
    removeEventListener("storage", cb);
  };
}
function stored(): string | null {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}
const read = () => themeChoice(document.documentElement.dataset.themeChoice, stored());

function setTheme(t: Theme) {
  const html = document.documentElement;
  html.dataset.themeChoice = t;
  try {
    if (t === "auto") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, t);
  } catch {
    // Private window or blocked storage: data-theme-choice keeps it for this page view.
  }
  html.dataset.theme = t === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;
  listeners.forEach((l) => l());
}

const LABELS: Record<Theme, string> = { auto: "Auto", light: "Light", dark: "Dark" };

// Auto (the device's setting), Light or Dark: a segmented control of native radio buttons, so it is announced as one choice of three and
// the arrow keys move it.
export function ThemeSwitch({ className = "" }: { className?: string }) {
  const id = useId();
  const current = useSyncExternalStore(subscribe, read, () => "auto" as Theme);
  return (
    <div data-theme-switch className={`flex items-center gap-2 ${className}`}>
      <span id={id} className="text-meta text-text-2">
        Theme
      </span>
      <div role="radiogroup" aria-labelledby={id} className="flex rounded-full border border-hairline p-0.5">
        {THEMES.map((t) => (
          <label key={t} className="flex cursor-pointer">
            <input type="radio" name={id} value={t} checked={current === t} onChange={() => setTheme(t)} className="peer sr-only" />
            <span className="flex min-h-11 items-center rounded-full px-3 text-meta text-text-2 transition-colors peer-checked:bg-text peer-checked:font-medium peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-text motion-reduce:transition-none">
              {LABELS[t]}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
