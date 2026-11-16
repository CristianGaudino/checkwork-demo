"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { countDashboardOpen } from "@/app/dashboard/count-action";

// Counts each open of a dashboard area (never by whom), so the owner can see which features dealers use. Every page change counts.
export function DashboardBeacon() {
  const path = usePathname();
  useEffect(() => void countDashboardOpen(path.split("/")[2] || "overview").catch(() => {}), [path]);
  return null;
}
