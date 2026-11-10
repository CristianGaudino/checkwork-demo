"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VEHICLE_TYPES, type VehicleType } from "@/lib/nav";
import { press } from "@/components/ui";
import { useVehicleHint } from "@/components/vehicleHint";

// Used, New, Commercial as a segmented control of links. Shows nothing until two sections exist: one choice is not a switch.
// `className` carries the display too (inline-flex by default), so a caller can hide it at some widths.
export function VehicleSwitch({ types = VEHICLE_TYPES, className = "inline-flex" }: { types?: readonly VehicleType[]; className?: string }) {
  const path = usePathname();
  const hint = useVehicleHint(); // set by a car page, whose address does not say whether the car is used, new or a van
  const on = types.filter((t) => t.enabled);
  if (on.length < 2) return null;
  return (
    <nav aria-label="Vehicle type" className={`rounded-full bg-hairline p-1 ${className}`}>
      {on.map((t) => {
        const current = hint ? hint === t.condition : path === t.href || path.startsWith(`${t.href}/`);
        return (
          <Link key={t.id} href={t.href} aria-current={current ? "page" : undefined} className={`flex min-h-11 items-center rounded-full px-4 text-meta font-semibold ${current ? "bg-card shadow-sm" : "text-text-2"} ${press}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
