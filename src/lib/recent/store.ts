import { createIdStore } from "@/lib/id-store";
import { SITE_SLUG } from "@/lib/site";

// The cars this browser opened last, newest first. Kept in this browser only, like saved cars, and cleared by the buyer from the list.
export const RECENT_MAX = 8;
export const RECENT_KEY = `${SITE_SLUG}:recent-ids`;
const recent = createIdStore(RECENT_KEY, RECENT_MAX);

export const useRecentIds = recent.useIds;
export const removeRecent = recent.remove;
export const clearRecent = () => recent.set([]);
// Opening a car puts it first; past the cap the oldest drops off.
export const noteViewed = (id: string) => recent.restore([id]);
