"use server";

import { markRead, noticesFor, noticesStore, readsOf } from "@/lib/admin/notifications";
import { currentMember } from "@/lib/permissions";

// The bell's two calls. Server actions rather than a route, so they read the same records as the pages (a route handler has its own
// copy when there is no database, in dev and the tests). Behind the dashboard's gate like every action posted to a dashboard page.
export async function loadNotices() {
  const me = await currentMember();
  const { items, unread } = noticesFor(await noticesStore.list(), await readsOf(me), me);
  return { unread, items: items.map(({ id, at, kind, text, href, unread: u }) => ({ id, at, kind, text, href, unread: u })) };
}

// One or more (by id) or, with nothing, all of this person's, read. A server action can be called with anything, so anything but a list
// of ids (or nothing) is refused rather than read as "all".
export async function readNotices(ids?: unknown) {
  if (ids !== undefined && !(Array.isArray(ids) && ids.every((i) => typeof i === "string"))) return;
  await markRead(await currentMember(), ids?.slice(0, 50));
}
