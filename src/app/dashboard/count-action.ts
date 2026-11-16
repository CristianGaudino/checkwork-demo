"use server";

import { isDashArea } from "@/lib/owner-api/counter-rules";
import { bump } from "@/lib/owner-api/counters";
import { requireStaff } from "@/lib/staff";

// Counts one open of a dashboard area (never who), for the owner API (#174). A server action of the dashboard, so it is behind
// Cloudflare Access with the rest of it: nobody outside can raise the counts. Only the menu's areas are taken.
export async function countDashboardOpen(area: unknown): Promise<void> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  if (!isDashArea(area)) return;
  try {
    await bump(`dash:${area}`);
  } catch {
    // a lost count is fine
  }
}
