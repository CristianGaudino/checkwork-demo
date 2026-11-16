import { forSale, type Car } from "@/lib/stock/types";
import { LISTING_SITE } from "@/lib/stock-source-rules";

// What one sync changes, worked out before anything is written. Pure, so every rule is tested.
// `current`: every car on the site (sold ones too). `listings`: every car the dealer has on DoneDeal now, already in our shape.
// - A listing we do not have is added; one we have sold, or hid when its ad came down, comes back on sale.
// - A listing whose details differ is updated. The site keeps its own listing date unless DoneDeal gives one.
// - A car for sale here that DoneDeal no longer lists is hidden, and the dealer is asked whether it sold or was withdrawn (owner's decision,
//   2026-11-12; it used to be marked sold, which was a guess). DoneDeal does not say why an ad came down.
// - The sync is held, and nothing changes, when DoneDeal's answer looks wrong: no cars at all while we have some, or fewer than half of what
//   we have (and more than a few gone). A dealer rarely sells half the forecourt in 15 minutes; a broken answer would empty the site.
export type Change = { before: Car; after: Car };
export type Plan = { added: Car[]; changed: Change[]; gone: Car[]; held?: string };

const HOLD_SHARE = 0.5;
const HOLD_MIN_GONE = 3;
// Fields only the site keeps: never overwritten by DoneDeal's copy, and never a difference.
const OURS = ["soldAt", "listedAt", "listing", "takenDownAt"] as const;
const comparable = (c: Car) => JSON.stringify({ ...c, soldAt: undefined, listedAt: undefined, listing: undefined, takenDownAt: undefined });

export function planSync(current: Car[], listings: Car[], today: string, { force = false } = {}): Plan {
  const byId = new Map(current.map((c) => [c.id, c]));
  const listed = new Set(listings.map((l) => l.id));
  const added: Car[] = [];
  const changed: Change[] = [];
  for (const l of listings) {
    const was = byId.get(l.id);
    if (!was) added.push({ ...l, listedAt: l.listedAt ?? today });
    else if (!forSale(was) || comparable(was) !== comparable(l)) {
      const keep = Object.fromEntries(OURS.map((k) => [k, was[k]]));
      changed.push({ before: was, after: { ...l, ...keep, soldAt: undefined, listing: undefined, takenDownAt: undefined, listedAt: l.listedAt ?? was.listedAt } });
    }
  }
  const onSite = current.filter(forSale);
  const gone = onSite.filter((c) => !listed.has(c.id));
  if (!force && onSite.length && !listings.length) return { added: [], changed: [], gone: [], held: `${LISTING_SITE} sent no cars, and the site has ${onSite.length}.` };
  if (!force && gone.length >= HOLD_MIN_GONE && gone.length > onSite.length * HOLD_SHARE)
    return { added: [], changed: [], gone: [], held: `${LISTING_SITE} no longer lists ${gone.length} of the ${onSite.length} cars for sale.` };
  return { added, changed, gone: gone.map((c) => ({ ...c, listing: "hidden" as const, takenDownAt: today })) };
}

