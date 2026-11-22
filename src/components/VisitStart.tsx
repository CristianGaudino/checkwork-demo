"use client";

import { useEffect } from "react";
import { startVisit } from "@/lib/count-client";
import { startNote } from "@/lib/visit-note";

// Counts a visit by the channel it came from, once per visit, and starts its note.
export function VisitStart() {
  useEffect(() => {
    startVisit();
    startNote();
  }, []);
  return null;
}
