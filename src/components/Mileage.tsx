"use client";

import { formatMileage, useUnit } from "@/lib/units";

// A car's mileage in the unit the buyer chose (src/lib/units.ts). The server and first paint say km, so nothing jumps for most buyers.
export function Mileage({ km }: { km: number }) {
  return <>{formatMileage(km, useUnit())}</>;
}

// Any text that has a miles version (a spec in mph): km text first, as the server and first paint say it.
export function ByUnit({ km, miles }: { km: string; miles: string }) {
  return <>{useUnit() === "miles" ? miles : km}</>;
}
