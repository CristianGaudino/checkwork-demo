"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { DEMO_ROLES, THEME_KEY, isAppPath, roleForPath, type Theme } from "@/lib/demo";
import { setDemoPermission, setDemoRole, setDemoStockSource, useDemoPermissions, useDemoRole, useStockSource } from "@/lib/demo-role";
import { parsePerms } from "@/lib/permission-rules";
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
  const path = usePathname();
  const router = useRouter();
  const inApp = isAppPath(path);
  const saved = useDemoRole();
  // In the dealer area the route is the role. On a public page it is the remembered one.
  const role = inApp ? roleForPath(path) : saved;
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);
  const margins = parsePerms(useDemoPermissions()).includes("margins");
  const donedeal = useStockSource() === "donedeal";
  return (
    <div data-demo-bar className="theme-dark relative z-40 border-b border-hairline bg-band text-meta text-text">
      <div className="mx-auto flex min-h-11 max-w-page flex-wrap items-center justify-between gap-x-1 px-2 sm:gap-x-3 sm:px-6 lg:px-8">
        <nav aria-label="View the demo as" className="flex flex-wrap items-center gap-y-1 py-1 sm:py-0">
          <span className="hidden text-text-2 sm:inline">View as</span>
          {DEMO_ROLES.filter((r) => showAreas || r.id === "customer").map((r) => (
            <Link
              key={r.id}
              href={r.href}
              onClick={(e) => {
                setDemoRole(r.id);
                // From a public page, Dealer changes that page (a Dashboard link in the header, and stock and social links on a car) instead of leaving it.
                if (!inApp && r.id !== "customer") {
                  e.preventDefault();
                  router.refresh();
                }
              }}
              aria-current={r.id === role ? "true" : undefined}
              className={`flex h-11 items-center px-2 sm:px-3 ${r.id === role ? "font-semibold text-text underline decoration-accent decoration-2 underline-offset-8" : "text-text-2"} ${press}`}
            >
              {r.label}
            </Link>
          ))}
          {role === "dealer" && showAreas && (
            // What the dealer may see: off is an ordinary dealer, on is one with the margins permission (src/lib/permissions.ts).
            <button
              type="button"
              aria-pressed={margins}
              onClick={() => {
                setDemoPermission("margins", !margins);
                router.refresh();
              }}
              className={`ml-0.5 flex h-8 shrink-0 items-center rounded-full border px-2 text-meta sm:ml-1 sm:px-3 ${margins ? "border-accent bg-accent text-on-accent" : "border-hairline text-text-2"} ${press}`}
            >
              Margins{" "}<span className="sr-only sm:not-sr-only sm:ml-1">{margins ? "on" : "off"}</span>
            </button>
          )}
          {role === "dealer" && showAreas && (
            // Where the stock comes from: added here, or synced from DoneDeal and read only here (src/lib/stock-source.ts).
            <button
              type="button"
              aria-pressed={donedeal}
              onClick={() => {
                setDemoStockSource(donedeal ? "checkwork" : "donedeal");
                router.refresh();
              }}
              className={`ml-0.5 flex h-8 shrink-0 items-center rounded-full border px-2 text-meta sm:ml-1 sm:px-3 ${donedeal ? "border-accent bg-accent text-on-accent" : "border-hairline text-text-2"} ${press}`}
            >
              DoneDeal{" "}<span className="sr-only sm:not-sr-only sm:ml-1">{donedeal ? "on" : "off"}</span>
            </button>
          )}
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
