import "server-only";
import { adminCars } from "@/lib/admin/stock-admin";
import { modeOf } from "@/lib/integrations";
import { isSold, type Car } from "@/lib/stock/types";

// The dealer's ads on DoneDeal, in our car shape. DoneDeal's API is for one dealer's own site, with the dealer's written consent (its API
// usage policy), so each site has its own key. The demo cannot use a real dealer's account: simulated, it answers with the stock as it is,
// so a sync shows working and changes nothing (owner's decision, 2026-11-11).
// ADAPTER GOES HERE: with DONEDEAL_API_KEY set and DoneDeal's docs in hand, replace the "not-installed" return with the API call. Map each
// ad to a Car: id from the ad id, slug, make and model slugs as the site makes them (src/lib/stock/makes.ts), photos, listingUrl (the ad),
// listedAt (the ad's publish date). Which fields DoneDeal returns, how photos may be stored and how often it may be called are in its docs,
// which we do not have yet (issue #108).
export type FeedResult = { ok: true; listings: Car[] } | { ok: false; reason: "not-connected" | "not-installed" | "failed" };

export async function fetchListings(): Promise<FeedResult> {
  const mode = modeOf("donedeal");
  if (mode === "off") return { ok: false, reason: "not-connected" };
  if (mode === "simulated") return { ok: true, listings: (await adminCars()).filter((c) => !isSold(c)) };
  return { ok: false, reason: "not-installed" };
}
