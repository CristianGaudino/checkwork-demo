import "server-only";
import { postsStore } from "./collections";
import { simulatedPost } from "./marketing";
import { publishPost } from "./publishers";

// Sends the scheduled posts whose time has come. Anything can call it: today the marketing page does when it opens, and a cron trigger on the
// Worker can call it on a timer (wrangler.jsonc "triggers") when a real publisher is connected. A post that fails to send stays scheduled.
// shortcut: runs only when something calls it, so a simulated post goes out the next time the marketing page opens, not at its exact minute.
export async function sendDuePosts(now = Date.now()): Promise<number> {
  let sent = 0;
  for (const p of await postsStore.list()) {
    if (p.status !== "scheduled" || p.scheduledFor === undefined || p.scheduledFor > now) continue;
    const r = await publishPost(p);
    if (!r.ok) continue;
    await postsStore.put({ ...p, status: "posted", postedAt: p.scheduledFor, ...(r.simulated && simulatedPost(p.id)) });
    sent++;
  }
  return sent;
}
