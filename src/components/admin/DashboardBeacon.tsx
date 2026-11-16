"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { count } from "@/lib/count-client";

// Counts which dashboard area is opened (never by whom), so the owner can see which features dealers use.
export function DashboardBeacon() {
  const path = usePathname();
  useEffect(() => count(`dash:${path.split("/")[2] || "overview"}`), [path]);
  return null;
}
