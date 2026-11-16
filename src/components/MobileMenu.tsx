"use client";

import { Sheet, leaveSheet } from "@/components/Sheet";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemoRole, useModules } from "@/lib/demo-role";
import { pathAllowed } from "@/lib/modules-rules";
import { useVehicleHint } from "@/components/vehicleHint";
import { DASHBOARD_LINK, VEHICLE_TYPES } from "@/lib/nav";
import { PhoneLink } from "@/components/PhoneLink";
import { ChevronDownIcon, MenuIcon, PhoneIcon } from "@/components/stock/icons";
import { accentButton, press } from "@/components/ui";

// Every page within two taps, below 1024px (the header links show from there). A bottom sheet (Sheet.tsx), like the filter sheet. The stock
// comes first as big rows; the rest sits in groups that fold open, closed unless they hold the page you are on (docs/mobile-navigation.md).
type Item = { href: string; label: string; long?: string };
export function MobileMenu({ home, primary: allPrimary, groups: allGroups }: { home: Item; primary: readonly Item[]; groups: readonly { title: string; links: readonly Item[] }[] }) {
  // Only the pages of modules the dealer has (#173).
  const modules = useModules();
  const primary = allPrimary.filter((l) => pathAllowed(l.href, modules));
  const groups = allGroups.map((g) => ({ ...g, links: g.links.filter((l) => pathAllowed(l.href, modules)) })).filter((g) => g.links.length > 0);
  const path = usePathname();
  // Viewing as the dealer's staff: their dashboard first. Home only away from home.
  const top = [...(useDemoRole() === "dealer" && modules.has("dashboard") ? [DASHBOARD_LINK] : []), ...(path !== "/" ? [home] : []), ...primary];

  const hint = useVehicleHint(); // a car page's address does not say whether it is used, new or a van; the page says so
  const here = (href: string) => {
    const vehicle = VEHICLE_TYPES.find((t) => t.href === href);
    return hint && vehicle ? hint === vehicle.condition : path === href || (href !== "/" && path.startsWith(`${href}/`));
  };
  // The current page: a thin accent bar in the gutter and accent text. Nothing moves.
  const row = (l: Item, size: string) => (
    <li key={l.href + l.label} className="relative">
      {here(l.href) && <span aria-hidden="true" className="absolute inset-y-3 -left-3 w-[3px] rounded-full bg-accent" />}
      <Link href={l.href} aria-current={here(l.href) ? "page" : undefined} onClick={leaveSheet} className={`flex items-center ${size} ${here(l.href) ? "text-accent-text" : ""}`}>
        {l.long ?? l.label}
      </Link>
    </li>
  );

  return (
    <Sheet
      title="Menu"
      closeLabel="Close menu"
      trigger={(open) => (
        <button type="button" aria-label="Menu" aria-haspopup="dialog" onClick={open} className={`-ml-2 flex h-11 w-11 items-center justify-center rounded-control lg:hidden ${press}`}>
          <MenuIcon />
        </button>
      )}
    >
      <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-6">
        <nav aria-label="Menu" className="flex flex-col">
          <ul className="flex flex-col pb-2">{top.map((l) => row(l, "min-h-12 text-heading font-semibold"))}</ul>
          {groups.map((g) => (
            <details key={g.title} open={g.links.some((l) => here(l.href))} className="group border-t border-hairline">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-body font-medium [&::-webkit-details-marker]:hidden">
                {g.title}
                <ChevronDownIcon className="size-5 text-text-2 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <ul className="flex flex-col pb-2 pl-3">{g.links.map((l) => row(l, "min-h-11 text-body text-text-2"))}</ul>
            </details>
          ))}
        </nav>
        <PhoneLink className={`flex w-full items-center justify-center gap-2 ${accentButton}`}>
          <PhoneIcon className="size-5" />
          Call us
        </PhoneLink>
      </div>
    </Sheet>
  );
}
