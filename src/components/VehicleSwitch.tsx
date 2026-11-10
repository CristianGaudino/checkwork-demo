"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VEHICLE_TYPES, type VehicleType } from "@/lib/nav";
import { press } from "@/components/ui";

// Used, New, Commercial as a segmented control of links. Shows nothing until two sections exist: one choice is not a switch.
export function VehicleSwitch({ types = VEHICLE_TYPES, className = "" }: { types?: readonly VehicleType[]; className?: string }) {
  const path = usePathname();
  const on = types.filter((t) => t.enabled);
  if (on.length < 2) return null;
  return (
    <nav aria-label="Vehicle type" className={`inline-flex rounded-full bg-hairline p-1 ${className}`}>
      {on.map((t) => {
        const current = path === t.href || path.startsWith(`${t.href}/`);
        return (
          <Link key={t.id} href={t.href} aria-current={current ? "page" : undefined} className={`flex min-h-11 items-center rounded-full px-4 text-meta font-semibold ${current ? "bg-card shadow-sm" : "text-text-2"} ${press}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
