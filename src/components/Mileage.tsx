"use client";

import { formatMileage, useUnit } from "@/lib/units";

// A car's mileage in the unit the buyer chose (src/lib/units.ts). The server and first paint say km, so nothing jumps for most buyers.
export function Mileage({ km }: { km: number }) {
  return <>{formatMileage(km, useUnit())}</>;
}
