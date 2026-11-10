"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { DEMO_ROLES, THEME_KEY, roleForPath, type Theme } from "@/lib/demo";
import { press } from "@/components/ui";

// The theme lives on <html data-theme>; this watches that attribute, so the button is right on first paint and after any change.
function subscribe(cb: () => void) {
  const o = new MutationObserver(cb);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => o.disconnect();
}
const read = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

function setTheme(t: Theme) {
  if (t === "dark") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    // Private window or blocked storage: the choice lasts for this page view only.
  }
}

export function DemoBar({ showAreas = true }: { showAreas?: boolean }) {
  const role = roleForPath(usePathname());
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);
  return (
    <div data-demo-bar className="theme-dark relative z-40 border-b border-hairline bg-band text-meta text-text">
      <div className="mx-auto flex h-11 max-w-[1280px] items-center justify-between gap-1 px-2 sm:gap-3 sm:px-6 lg:px-8">
        <nav aria-label="View the demo as" className="flex items-center">
          <span className="hidden text-text-2 sm:inline">View as</span>
          {DEMO_ROLES.filter((r) => showAreas || r.id === "customer").map((r) => (
            <Link
              key={r.id}
              href={r.href}
              aria-current={r.id === role ? "true" : undefined}
              className={`flex h-11 items-center px-2 sm:px-3 ${r.id === role ? "font-semibold text-text underline decoration-accent decoration-2 underline-offset-8" : "text-text-2"} ${press}`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          aria-pressed={theme === "dark"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={`flex h-11 items-center px-2 text-text-2 ${press}`}
        >
          {theme === "dark" ? "Dark" : "Light"}
        </button>
      </div>
    </div>
  );
}
