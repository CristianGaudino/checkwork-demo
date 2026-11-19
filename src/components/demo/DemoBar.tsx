"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useId, useState, useSyncExternalStore } from "react";
import { DEMO_ROLES, THEME_KEY, isAppPath, roleForPath, type Theme } from "@/lib/demo";
import { setDealerRole, setDemoRole, setDemoStockSource, useDealerRole, useDemoRole, useStockSource } from "@/lib/demo-role";
import { ROLES, type Role } from "@/lib/permission-rules";
import { LISTING_SITE } from "@/lib/stock-source-rules";
import { ChevronDownIcon } from "@/components/stock/icons";
import { ModuleSwitches } from "./ModuleSwitches";
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

// The page keeps room for whichever form of the bar is showing (--demo-bar-h): the whole bar from 640px, the pill and its gap on a phone.
// Hidden (display: none) forms report nothing, so the two never fight.
function useRoomFor(extra: number) {
  return useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      const set = () => el.getClientRects().length && document.documentElement.style.setProperty("--demo-bar-h", `${el.offsetHeight + extra}px`);
      set();
      const o = new ResizeObserver(set);
      o.observe(el);
      return () => o.disconnect();
    },
    [extra],
  );
}

// The demo's own controls: view as the customer or the dealer, and as the dealer, the role and where the stock comes from; and the theme.
// Not part of the site: a real client site has none (NEXT_PUBLIC_DEMO_BAR=off). On a phone it folds into a small pill at the bottom right
// that opens the controls above it; from 640px it is one slim line at the foot of the screen (docs/mobile-navigation.md).
export function DemoBar({ showAreas = true }: { showAreas?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const inApp = isAppPath(path);
  const saved = useDemoRole();
  // In the dealer area the route is the role. On a public page it is the remembered one.
  const role = inApp ? roleForPath(path) : saved;
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);
  const dealerRole = useDealerRole();
  const donedeal = useStockSource() === "donedeal";
  const [open, setOpen] = useState(false); // mirrors the popover, for the chevron and aria-expanded
  const panelId = useId();
  const barRoom = useRoomFor(0);
  const pillRoom = useRoomFor(20); // the pill and the 12px gap under it, and a little air above

  const chip = "flex h-9 shrink-0 items-center rounded-full border px-3 text-meta";
  // `phone`: the controls in the pill's panel, where the row wraps and the module list opens in place; else the slim bar.
  const controls = (phone: boolean) => (
    <>
      <nav aria-label="View the demo as" className="flex items-center">
        <span className="pl-2 pr-1 text-text-2">View as</span>
        {DEMO_ROLES.filter((r) => showAreas || r.id === "customer").map((r) => (
          <Link
            key={r.id}
            href={r.href}
            prefetch={isAppPath(r.href) ? false : undefined} // the dealer area sits behind Cloudflare Access: a prefetch from a public page gets its login page
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
      </nav>
      {role === "dealer" && showAreas && (
        <div className={`flex items-center gap-2 ${phone ? "w-full flex-wrap" : ""}`}>
          {/* Which member of the team the demo acts as: the role decides what they may see (src/lib/permissions.ts). The browser's own
              select, not the site's Combobox: one compact control in a bar fixed to the foot of the screen, where a list would open off it. */}
          <label className={`${chip} border-hairline pr-0`}>
            <span aria-hidden className="mr-1 text-text-2">Role</span>
            <select
              aria-label="Role"
              value={dealerRole}
              onChange={(e) => {
                setDealerRole(e.target.value as Role);
                router.refresh();
              }}
              className="h-full cursor-pointer rounded-full bg-transparent pr-3 text-meta font-medium text-text"
            >
              {ROLES.map((r) => (
                <option key={r} value={r} className="bg-band text-text">
                  {r}
                </option>
              ))}
            </select>
          </label>
          {/* Where the stock comes from: added here, or synced from a listing site (DoneDeal or CarsIreland) and read only here (src/lib/stock-source.ts). */}
          <button
            type="button"
            aria-pressed={donedeal}
            onClick={() => {
              setDemoStockSource(donedeal ? "checkwork" : "donedeal");
              router.refresh();
            }}
            className={`${chip} ${donedeal ? "border-accent bg-accent text-on-accent" : "border-hairline text-text-2"} ${press}`}
          >
            {LISTING_SITE} sync<span className="ml-1">{donedeal ? "on" : "off"}</span>
          </button>
          {/* Which modules the dealer has (#173), so a smaller site can be shown. */}
          <ModuleSwitches chip={chip} inline={phone} />
        </div>
      )}
      <button type="button" aria-pressed={theme === "dark"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className={`flex h-11 items-center px-2 text-text-2 ${press}`}>
        {theme === "dark" ? "Dark" : "Light"}
      </button>
    </>
  );

  return (
    <div data-demo-bar className="theme-dark text-meta text-text">
      {/* A phone: the pill, and the controls above it when open. In the dashboard it stays a pill until 1024px, above the tab bar that
          shows until then, so the two are never stacked at the foot of a tablet. The controls are a native popover: a tap anywhere else, or
          Escape, folds them again. Placed 3rem above the pill's foot: its 2.5rem and an 0.5rem gap. */}
      <div className={`fixed right-3 z-40 ${inApp ? "bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden" : "bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:hidden"}`}>
        <div
          id={panelId}
          popover="auto"
          onToggle={(e) => setOpen(e.newState === "open")}
          className={`fixed inset-auto right-3 m-0 w-[min(20rem,calc(100vw-1.5rem))] flex-col items-start gap-1 rounded-card border border-hairline bg-band p-2 text-text shadow-panel ${inApp ? "bottom-[calc(7rem+env(safe-area-inset-bottom))] max-lg:[&:popover-open]:flex lg:hidden" : "bottom-[calc(3.75rem+env(safe-area-inset-bottom))] max-sm:[&:popover-open]:flex sm:hidden"}`}
        >
          {controls(true)}
        </div>
        <button
          ref={pillRoom}
          type="button"
          aria-expanded={open}
          popoverTarget={panelId}
          className={`flex h-10 items-center gap-1.5 rounded-full border border-hairline bg-band pl-4 pr-3 shadow-panel ${press}`}
        >
          <span className="text-text-2">Demo</span>
          <span className="font-semibold">{role === "dealer" ? "Dealer" : "Customer"}</span>
          <ChevronDownIcon className={`size-4 text-text-2 transition-transform motion-reduce:transition-none ${open ? "" : "rotate-180"}`} />
        </button>
      </div>
      {/* From 640px (1024px in the dashboard): one slim line at the foot of the screen, the theme at its right end. */}
      <div ref={barRoom} className={`fixed inset-x-0 bottom-0 z-40 hidden border-t border-hairline bg-band pb-[env(safe-area-inset-bottom)] ${inApp ? "lg:block" : "sm:block"}`}>
        <div className="mx-auto flex min-h-11 max-w-page items-center gap-x-3 px-6 lg:px-8 [&>:last-child]:ml-auto">{controls(false)}</div>
      </div>
    </div>
  );
}
