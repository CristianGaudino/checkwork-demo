"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useVehicleHint } from "@/components/vehicleHint";
import { useModules } from "@/lib/demo-role";
import { isAppPath } from "@/lib/demo";
import { HEADER_LINKS, VEHICLE_TYPES } from "@/lib/nav";
import { pathAllowed } from "@/lib/modules-rules";

// The desktop links (from 1024px). Used, New and Commercial are the first three, like any other section. A red bar under the current one.
const item = "relative inline-flex min-h-11 items-center whitespace-nowrap text-meta font-semibold transition-colors hover:text-text-2";
const bar = "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-accent";


const within = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

export function HeaderLinks() {
  const path = usePathname();
  const hint = useVehicleHint(); // a car page's address does not say whether it is used, new or a van; the page says so
  const modules = useModules();
  const vehicles = VEHICLE_TYPES.filter((t) => pathAllowed(t.href, modules)).map((t) => ({ href: t.href, label: t.nav, current: hint ? hint === t.condition : within(path, t.href) }));
  const others = HEADER_LINKS.filter((l) => pathAllowed(l.href, modules)).map((l) => ({ ...l, current: within(path, l.href) }));
  return (
    <div className="hidden items-center gap-4 lg:flex xl:gap-6">
      {[...vehicles, ...others].map((l) => (
        <Link key={l.href} href={l.href} prefetch={isAppPath(l.href) ? false : undefined} aria-current={l.current ? "page" : undefined} className={`${item} ${l.current ? bar : ""}`}>
          {l.label}
        </Link>
      ))}
    </div>
  );
}
