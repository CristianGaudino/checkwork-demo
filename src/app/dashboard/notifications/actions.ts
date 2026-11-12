"use server";

import { markRead, noticesFor, noticesStore } from "@/lib/admin/notifications";
import { currentMember } from "@/lib/permissions";

// The bell's two calls. Server actions rather than a route, so they read the same records as the pages (a route handler has its own
// copy when there is no database, in dev and the tests). Behind the dashboard's gate like every action posted to a dashboard page.
export async function loadNotices() {
  const me = await currentMember();
  const { items, unread } = noticesFor(await noticesStore.list(), me);
  return { unread, items: items.map(({ id, at, kind, text, href, unread: u }) => ({ id, at, kind, text, href, unread: u })) };
}

// One (by id) or all of this person's, read.
export async function readNotices(ids?: string[]) {
  await markRead(await currentMember(), ids?.slice(0, 50));
}
