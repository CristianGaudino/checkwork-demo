"use client";

import { useId, useSyncExternalStore } from "react";
import { THEMES, THEME_KEY, type Theme } from "@/lib/demo";

// The one theme store, for the footer and the demo bar. Auto is no stored value: THEME_SCRIPT in the head then follows the device.
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => (listeners.add(cb), () => void listeners.delete(cb));
let choice: Theme | undefined; // kept here too, so a choice lasts the page view when storage is blocked
function stored(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}
const read = () => (choice ??= stored());

function setTheme(t: Theme) {
  choice = t;
  try {
    if (t === "auto") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, t);
  } catch {
    // Private window or blocked storage: the choice lasts for this page view only.
  }
  document.documentElement.dataset.theme = t === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;
  listeners.forEach((l) => l());
}

const LABELS: Record<Theme, string> = { auto: "Auto", light: "Light", dark: "Dark" };

// Auto (the device's setting), Light or Dark: a segmented control of native radio buttons, so it is announced as one choice of three and
// the arrow keys move it.
export function ThemeSwitch({ className = "" }: { className?: string }) {
  const id = useId();
  const current = useSyncExternalStore(subscribe, read, () => "auto" as Theme);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span id={id} className="text-meta text-text-2">
        Theme
      </span>
      <div role="radiogroup" aria-labelledby={id} className="flex rounded-full border border-hairline p-0.5">
        {THEMES.map((t) => (
          <label key={t} className="flex cursor-pointer">
            <input type="radio" name={id} value={t} checked={current === t} onChange={() => setTheme(t)} className="peer sr-only" />
            <span className="flex h-10 items-center rounded-full px-3 text-meta text-text-2 transition-colors peer-checked:bg-text peer-checked:font-medium peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-text motion-reduce:transition-none">
              {LABELS[t]}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
