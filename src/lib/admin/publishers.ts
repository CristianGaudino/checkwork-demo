import "server-only";
import { isConnected } from "@/lib/integrations";
import type { Ad, Newsletter, SocialPost } from "./collections";
import type { SendResult } from "./marketing";

// The three places a draft leaves the admin: a post to Facebook or Instagram, an ad to Meta or Google, a newsletter to subscribers.
// Each checks that its service is connected (src/lib/integrations.ts) and says so if it is not: it never reports a success that did not
// happen. ADAPTER GOES HERE: when the keys exist and a provider is chosen, replace the second return in each with the real call.
export async function publishPost(post: SocialPost): Promise<SendResult> {
  void post; // for the adapter that replaces the body below
  if (!isConnected("social")) return { ok: false, reason: "not-connected" };
  return { ok: false, reason: "not-installed" };
}

export async function startAd(ad: Ad): Promise<SendResult> {
  void ad;
  if (!isConnected("ads")) return { ok: false, reason: "not-connected" };
  return { ok: false, reason: "not-installed" };
}

export async function sendNewsletter(n: Newsletter): Promise<SendResult> {
  void n;
  if (!isConnected("newsletter")) return { ok: false, reason: "not-connected" };
  return { ok: false, reason: "not-installed" };
}
