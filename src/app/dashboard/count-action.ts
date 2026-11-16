"use server";

import { isDashArea } from "@/lib/owner-api/counter-rules";
import { bump } from "@/lib/owner-api/counters";

// Counts one open of a dashboard area (never who), for the owner API (#174). A server action of the dashboard, so it is behind
// Cloudflare Access with the rest of it: nobody outside can raise the counts. Only the menu's areas are taken.
export async function countDashboardOpen(area: unknown): Promise<void> {
  if (!isDashArea(area)) return;
  try {
    await bump(`dash:${area}`);
  } catch {
    // a lost count is fine
  }
}
