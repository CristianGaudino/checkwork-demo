import "server-only";
import { modeOf } from "@/lib/integrations";
import type { Ad, AdminReview, Newsletter, SocialPost } from "./collections";
import type { SendResult } from "./marketing";

// The three places a draft leaves the admin: a post to Facebook or Instagram, an ad to Meta or Google, a newsletter to subscribers.
// A service with keys is "live" and goes to its adapter. One without keys is "simulated" on the demo (SIMULATE_INTEGRATIONS, default on):
// it reports success so the whole flow can be shown, marks the result `simulated`, and sends nothing outside. With simulation off and no
// keys it says not-connected. ADAPTER GOES HERE: when the keys exist and a provider is chosen, replace the "not-installed" return in each.
const run = (id: Parameters<typeof modeOf>[0]): SendResult => {
  const mode = modeOf(id);
  if (mode === "off") return { ok: false, reason: "not-connected" };
  return mode === "simulated" ? { ok: true, simulated: true } : { ok: false, reason: "not-installed" };
};

export async function publishPost(post: SocialPost): Promise<SendResult> {
  void post; // for the adapter that replaces the body below
  return run("social");
}

export async function startAd(ad: Ad): Promise<SendResult> {
  void ad;
  return run("ads");
}

export async function sendNewsletter(n: Newsletter): Promise<SendResult> {
  void n;
  return run("newsletter");
}

// A reply to a Google review, or "" to remove it: Google Business Profile's reviews.updateReply / deleteReply, for the dealer's verified
// profile. ADAPTER GOES HERE with GOOGLE_BUSINESS_LOCATION and an OAuth refresh token from an owner or manager.
export async function postReviewReply(review: AdminReview, reply: string): Promise<SendResult> {
  void review;
  void reply;
  return run("gbp");
}
