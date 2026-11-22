"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { startVisit } from "@/lib/count-client";
import { isAppPath } from "@/lib/demo";
import { startNote } from "@/lib/visit-note";

// The public site's header, footer and pills do not belong in the dealer area, which has its own frame.
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return isAppPath(usePathname()) ? null : children;
}

// Counts a visit by the channel it came from, once per visit, on the public site only (rendered inside SiteChrome), and starts its note.
export function VisitStart() {
  useEffect(() => {
    startVisit();
    startNote();
  }, []);
  return null;
}
