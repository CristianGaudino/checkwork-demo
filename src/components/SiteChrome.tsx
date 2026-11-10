"use client";

import { usePathname } from "next/navigation";
import { isAppPath } from "@/lib/demo";

// The public site's header, footer and pills do not belong in the dealer and platform areas, which have their own frame.
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return isAppPath(usePathname()) ? null : children;
}
