"use server";

import { revalidatePath } from "next/cache";
import { AD_PLATFORMS, POST_LIMITS } from "@/lib/admin/networks";
import { redirect } from "next/navigation";
import { z } from "zod";
import { NETWORKS, adsStore, getSettings, newslettersStore, postsStore, subscribersStore, type Ad, type SocialPost } from "@/lib/admin/collections";
import { simulatedAd, simulatedLetter, simulatedPost, writeNewsletter, writePost, type SendResult } from "@/lib/admin/marketing";
import { publishPost, sendNewsletter, startAd } from "@/lib/admin/publishers";
import { adminCars } from "@/lib/admin/stock-admin";
import { carName } from "@/lib/stock/format";
import { forSale } from "@/lib/stock/types";
import { newId } from "@/lib/admin/ids";
import { logActivity } from "@/lib/admin/activity";
import { fmtEur } from "@/lib/admin/format";
import { aOrAn } from "@/lib/admin/activity-text";
import type { ComposerCar } from "@/components/admin/PostComposer";
import { dublinMs } from "@/lib/admin/format";

const postRef = (p: SocialPost) => ({ kind: "post" as const, id: p.id, label: p.carTitle ?? "A post" });
const adRef = (a: Ad) => ({ kind: "ad" as const, id: a.id, label: a.carTitle });
const letterRef = (n: { id: string; subject: string }) => ({ kind: "newsletter" as const, id: n.id, label: n.subject });

// A result goes back to the page as a short code, never as text from the request, so the page can only ever say what it knows.
const go = (tab: string, notice: string): never => redirect(`/dashboard/marketing?tab=${tab}&notice=${notice}`);
// `kind` is the service that was tried (social, ads, newsletters), which picks the "not connected" wording.
const outcome = (tab: string, kind: string, r: SendResult, ok: string) => go(tab, r.ok ? ok : r.reason === "not-connected" ? `${kind}-not-connected` : `${kind}-not-installed`);

// The composer: one post, and an ad for the same car if the switch is on. A draft is kept first, so a post that cannot go out is not lost.
const compose = z.object({
  carSlug: z.string().min(1),
  network: z.enum(NETWORKS),
  text: z.string().trim().min(1).max(POST_LIMITS.text),
  intent: z.enum(["publish", "draft"]),
  timing: z.enum(["now", "later"]),
  when: z.string().optional(),
  ad: z.string().optional(),
  platform: z.enum(AD_PLATFORMS).optional(),
  budgetEur: z.coerce.number().int().min(POST_LIMITS.budgetMin).max(POST_LIMITS.budgetMax).optional(),
});
export async function composeAction(data: FormData) {
  const r = compose.safeParse(Object.fromEntries(data));
  const car = r.success ? (await adminCars()).find((c) => c.slug === r.data.carSlug) : undefined;
  if (!r.success || !car) return go("posts", "invalid");
  const d = r.data;
  const later = d.intent === "publish" && d.timing === "later";
  // The time is typed in Irish time (datetime-local has no zone), like the test drive form.
  const [day = "", time = ""] = (d.when ?? "").split("T");
  const when = later ? dublinMs(day, time) : 0;
  if (later && (Number.isNaN(when) || when < Date.now())) return go("posts", "invalid-time");
  // Only photos of this car can go on its post.
  const photos = data.getAll("photos").map(String).filter((src) => car.photos.some((p) => p.src === src)).slice(0, POST_LIMITS.photos);
  const post: SocialPost = { id: newId("post"), network: d.network, carSlug: car.slug, carTitle: carName(car), text: d.text, ...(photos.length && { photos }), status: later ? "scheduled" : "draft", ...(later && { scheduledFor: when }), createdAt: Date.now() };
  await postsStore.put(post);
  const withAd = d.ad === "on" && !later && d.platform && d.budgetEur; // an ad starts with the post, so not for a scheduled one
  const adDraft: Ad | null = withAd ? { id: newId("ad"), name: `${carName(car)} ${d.platform} ad`, platform: d.platform!, carTitle: carName(car), budgetEur: d.budgetEur!, status: "draft", impressions: 0, clicks: 0, leads: 0, createdAt: Date.now() } : null;
  if (adDraft) await adsStore.put(adDraft);
  if (d.intent === "draft") {
    await logActivity("marketing", `Saved a draft ${d.network} post${adDraft ? " and ad" : ""}`, postRef(post));
    return go("posts", adDraft ? "draft-ad" : "post-draft");
  }
  if (later) {
    await logActivity("marketing", `Scheduled ${aOrAn(d.network)} post`, postRef(post));
    return go("posts", "post-scheduled");
  }
  const sent = await publishPost(post);
  if (!sent.ok) {
    await logActivity("marketing", `Saved a draft ${d.network} post (it could not be posted)`, postRef(post));
    return outcome("posts", "social", sent, "");
  }
  await postsStore.put({ ...post, status: "posted", postedAt: Date.now(), ...(sent.simulated && { simulated: true, ...simulatedPost(post.id) }) });
  await logActivity("marketing", `Published ${aOrAn(d.network)} post`, postRef(post));
  if (!adDraft) return go("posts", "post-published");
  const started = await startAd(adDraft);
  if (started.ok) {
    await adsStore.put({ ...adDraft, status: "running", ...(started.simulated && simulatedAd(adDraft.id)) });
    await logActivity("marketing", `Started a ${adDraft.platform} ad with a ${fmtEur(adDraft.budgetEur)} budget`, adRef(adDraft));
  }
  go("posts", started.ok ? "published-ad" : "published-ad-draft");
}

export async function publishPostAction(id: string) {
  const post = await postsStore.get(id);
  if (!post) return go("posts", "invalid");
  const r = await publishPost(post);
  if (r.ok) {
    await postsStore.put({ ...post, status: "posted", postedAt: Date.now(), ...(r.simulated && { simulated: true, ...simulatedPost(post.id) }) });
    await logActivity("marketing", `Published ${aOrAn(post.network)} post`, postRef(post));
  }
  outcome("posts", "social", r, "post-published");
}

export async function deletePostAction(id: string) {
  const post = await postsStore.get(id);
  await postsStore.remove(id);
  if (post) await logActivity("marketing", `Deleted ${aOrAn(post.network)} post`, postRef(post));
  revalidatePath("/dashboard/marketing");
  go("posts", "deleted");
}

export async function startAdAction(id: string) {
  const a = await adsStore.get(id);
  if (!a) return go("posts", "invalid");
  const r = await startAd(a);
  if (r.ok) {
    await adsStore.put({ ...a, status: "running", ...(r.simulated && simulatedAd(a.id)) });
    await logActivity("marketing", `Started a ${a.platform} ad with a ${fmtEur(a.budgetEur)} budget`, adRef(a));
  }
  outcome("posts", "ads", r, "ad-started");
}

export async function deleteAdAction(id: string) {
  const ad = await adsStore.get(id);
  await adsStore.remove(id);
  if (ad) await logActivity("marketing", `Deleted a ${ad.platform} ad`, adRef(ad));
  go("posts", "deleted");
}

// The composer asks for a car's photos and suggested text when the dealer picks it, so the page never carries them for the whole stock.
export async function composerCarAction(slug: string): Promise<ComposerCar | null> {
  const car = (await adminCars()).find((c) => c.slug === slug && forSale(c));
  if (!car) return null;
  const { marketing } = await getSettings();
  return { slug: car.slug, title: carName(car), photos: car.photos.slice(0, 6), text: Object.fromEntries(NETWORKS.map((n) => [n, writePost(car, n, marketing)])) as ComposerCar["text"] };
}

// "Write from the newest cars" fills the letter from the stock; otherwise the dealer's own subject and text are used.
const letter = z.object({ subject: z.string().trim().max(120), body: z.string().trim().max(4000) });
export async function createNewsletterAction(data: FormData) {
  const { marketing } = await getSettings();
  let { subject, body } = { subject: "", body: "" };
  if (data.get("intent") === "write") {
    const cars = (await adminCars()).filter(forSale).sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 5);
    ({ subject, body } = writeNewsletter(cars, marketing));
  } else {
    const r = letter.safeParse(Object.fromEntries(data));
    if (!r.success || !r.data.subject || !r.data.body) return go("newsletters", "invalid");
    ({ subject, body } = r.data);
  }
  const letterDraft = { id: newId("nl"), subject, body, status: "draft" as const, createdAt: Date.now() };
  await newslettersStore.put(letterDraft);
  await logActivity("marketing", "Wrote a newsletter", letterRef(letterDraft));
  go("newsletters", "letter-created");
}

export async function sendNewsletterAction(id: string) {
  const n = await newslettersStore.get(id);
  if (!n || n.status !== "draft") return go("newsletters", "invalid");
  const r = await sendNewsletter(n);
  if (r.ok) {
    await newslettersStore.put({ ...n, status: "sent", sentAt: Date.now(), ...(r.simulated && simulatedLetter(n.id, (await subscribersStore.list()).filter((x) => x.status === "subscribed").length)) });
    await logActivity("marketing", "Sent the newsletter", letterRef(n));
  }
  outcome("newsletters", "newsletters", r, "letter-sent");
}

export async function deleteNewsletterAction(id: string) {
  const n = await newslettersStore.get(id);
  await newslettersStore.remove(id);
  if (n) await logActivity("marketing", "Deleted a newsletter", letterRef(n));
  go("newsletters", "deleted");
}
