"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import { DEMO_ROLES, THEME_KEY, isAppPath, roleForPath, type Theme } from "@/lib/demo";
import { setDealerRole, setDemoRole, setDemoStockSource, useDealerRole, useDemoRole, useStockSource } from "@/lib/demo-role";
import { ROLES, type Role } from "@/lib/permission-rules";
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
  const dealerRole = useDealerRole();
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--demo-bar-h", `${el.offsetHeight}px`);
    set();
    const o = new ResizeObserver(set);
    o.observe(el);
    return () => o.disconnect();
  }, []);
  const donedeal = useStockSource() === "donedeal";
  return (
    // At the foot of the screen, so the site reads as itself from the top. Its height is shared as --demo-bar-h, which keeps the page's
    // last lines and the compare bar clear of it however many lines it wraps to.
    <div ref={measure} data-demo-bar className="theme-dark fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-band pb-[env(safe-area-inset-bottom)] text-meta text-text">
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
            // Which member of the team the demo acts as: the role decides what they may see (src/lib/permissions.ts). The browser's own
            // select, not the site's Combobox: it is one compact control in a bar fixed to the foot of the screen, where a list would open off it.
            <label className="ml-0.5 flex h-8 shrink-0 items-center rounded-full border border-hairline pl-2 sm:ml-1 sm:pl-3">
              <span aria-hidden className="hidden text-text-2 sm:mr-1 sm:inline">Role</span>
              <select
                aria-label="Role"
                value={dealerRole}
                onChange={(e) => {
                  setDealerRole(e.target.value as Role);
                  router.refresh();
                }}
                className="h-full cursor-pointer rounded-full bg-transparent pr-2 text-meta font-medium text-text sm:pr-3"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="bg-band text-text">
                    {r}
                  </option>
                ))}
              </select>
            </label>
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
