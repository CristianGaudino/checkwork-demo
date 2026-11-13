import "server-only";
import { logActivity } from "@/lib/admin/activity";
import { ALERT_KIND_LABELS, alertsStore, subscribersStore } from "@/lib/admin/collections";
import { readUnsubscribeToken, type UnsubscribeTarget } from "@/lib/unsubscribe";

// The page and the mail app's one-click button both end here. Only the secret's owner can make a token, so the token alone is the proof.
// Without UNSUBSCRIBE_SECRET no email can carry a link (unsubscribeParts needs it), so a link that reaches here without one is refused.
export const readToken = (t: unknown) => {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  return secret ? readUnsubscribeToken(t, secret) : Promise.resolve(null);
};

// What the link stops, in words for the page, or null when its record has gone (erased on request, or a deleted alert).
export async function describe(t: UnsubscribeTarget): Promise<{ what: string; stopped: boolean } | null> {
  if (t.kind === "newsletter") {
    const s = await subscribersStore.get(t.id);
    return s ? { what: "our newsletter", stopped: s.status === "unsubscribed" } : null;
  }
  const a = await alertsStore.get(t.id);
  return a ? { what: `${ALERT_KIND_LABELS[a.kind].toLowerCase()} alerts for ${a.criteria}`, stopped: !a.active } : null;
}

// Stops it, once: a second press changes nothing and records nothing. Recorded in Activity without the person, as data requests are.
export async function unsubscribe(t: UnsubscribeTarget): Promise<boolean> {
  if (t.kind === "newsletter") {
    const s = await subscribersStore.get(t.id);
    if (!s) return false;
    if (s.status !== "unsubscribed") {
      await subscribersStore.put({ ...s, status: "unsubscribed" });
      await logActivity("customers", "Someone unsubscribed from the newsletter", undefined, "Email link");
    }
    return true;
  }
  const a = await alertsStore.get(t.id);
  if (!a) return false;
  if (a.active) {
    await alertsStore.put({ ...a, active: false });
    await logActivity("customers", "Someone stopped a stock alert", undefined, "Email link");
  }
  return true;
}
