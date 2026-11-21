"use server";

import { revalidatePath } from "next/cache";
import { AD_PLATFORMS, FORMATS_FOR, FORMAT_LIMITS, POST_FORMATS, POST_LIMITS, PUBLISH_MODE, STORY_LAYOUTS } from "@/lib/admin/networks";
import { requireModule } from "@/lib/modules";
import { checkUpload, MEDIA_LIMITS } from "@/lib/admin/media-rules";
import { dropMedia, storeMedia } from "@/lib/admin/media";
import { redirect } from "next/navigation";
import { z } from "zod";
import { NETWORKS, adsStore, getSettings, mediaStore, newslettersStore, postsStore, subscribersStore, type Ad, type MediaItem, type SocialPost } from "@/lib/admin/collections";
import { newestForSale, simulatedAd, simulatedLetter, simulatedPost, writeNewsletter, writePost, type SendResult } from "@/lib/admin/marketing";
import { publishPost, sendNewsletter, startAd } from "@/lib/admin/publishers";
import { adminCars } from "@/lib/admin/stock-admin";
import { carName } from "@/lib/stock/format";
import { forSale, isReduced } from "@/lib/stock/types";
import { priceInfo } from "@/lib/stock/price";
import { newId } from "@/lib/admin/ids";
import { logActivity } from "@/lib/admin/activity";
import { fmtEur } from "@/lib/admin/format";
import { aOrAn } from "@/lib/admin/activity-text";
import type { ComposerCar } from "@/components/admin/PostComposer";
import { dublinMs } from "@/lib/admin/format";
import { requireStaff } from "@/lib/staff";

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
  format: z.enum(POST_FORMATS).default("post"),
  layout: z.enum(STORY_LAYOUTS).optional(),
  // Long enough for a library video kept as a data: URL where there is no bucket (dev, E2E); only a video found in the library is used.
  video: z.string().max(Math.ceil((MEDIA_LIMITS.videoBytes * 4) / 3) + 100).optional(),
  when: z.string().optional(),
  ad: z.string().optional(),
  platform: z.enum(AD_PLATFORMS).optional(),
  budgetEur: z.coerce.number().int().min(POST_LIMITS.budgetMin).max(POST_LIMITS.budgetMax).optional(),
});
export async function composeAction(data: FormData) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("social");
  const r = compose.safeParse(Object.fromEntries(data));
  const car = r.success ? (await adminCars()).find((c) => c.slug === r.data.carSlug) : undefined;
  if (!r.success || !car) return go("posts", "invalid");
  if (!forSale(car)) return go("posts", "car-gone"); // sold or hidden while the composer was open
  const d = r.data;
  const later = d.intent === "publish" && d.timing === "later";
  // The time is typed in Irish time (datetime-local has no zone), like the test drive form.
  const [day = "", time = ""] = (d.when ?? "").split("T");
  const when = later ? dublinMs(day, time) : 0;
  if (later && (Number.isNaN(when) || when < Date.now())) return go("posts", "invalid-time");
  // Only photos of this car, or from the dealer's own library, can go on a post; a video must be one from the library and short enough.
  const library = await mediaStore.list();
  const okPhoto = (src: string) => car.photos.some((p) => p.src === src) || library.some((m) => m.kind === "image" && m.src === src);
  const limits = FORMAT_LIMITS[d.format];
  const photos = data.getAll("photos").map(String).filter(okPhoto).slice(0, limits.photos[1]);
  const clip = limits.video ? library.find((m) => m.kind === "video" && m.src === d.video && (m.durationSec ?? 0) <= limits.maxSeconds) : undefined;
  // A draft can be unfinished; what goes out (now or later) must have what its format needs.
  const ready = d.format === "reel" ? Boolean(clip) : d.format === "story" ? photos.length + (clip ? 1 : 0) > 0 : photos.length >= limits.photos[0];
  if (!(FORMATS_FOR[d.network] as readonly string[]).includes(d.format) || (d.intent === "publish" && !ready)) return go("posts", "invalid");
  const post: SocialPost = { id: newId("post"), network: d.network, carSlug: car.slug, carTitle: carName(car), text: d.text, ...(photos.length && { photos }), ...(d.format !== "post" && { format: d.format }), ...(d.format === "story" && d.layout && { layout: d.layout }), ...(clip && { video: clip.src }), status: later ? "scheduled" : "draft", ...(later && { scheduledFor: when }), createdAt: Date.now() };
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
  // A story, or anything on TikTok, is made ready here and posted from the phone (PUBLISH_MODE): the notice says so.
  if (!adDraft) return go("posts", PUBLISH_MODE[d.network][d.format] === "prepare" ? "post-ready" : "post-published");
  const started = await startAd(adDraft);
  if (started.ok) {
    await adsStore.put({ ...adDraft, status: "running", startedAt: Date.now(), ...(started.simulated && simulatedAd(adDraft.id)) });
    await logActivity("marketing", `Started a ${adDraft.platform} ad with a ${fmtEur(adDraft.budgetEur)} budget`, adRef(adDraft));
  }
  go("posts", started.ok ? "published-ad" : "published-ad-draft");
}

export async function publishPostAction(id: string) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("social");
  const post = await postsStore.get(id);
  if (!post || post.status === "posted") return go("posts", "invalid"); // a draft or a scheduled post only: never the same post twice
  const r = await publishPost(post);
  if (r.ok) {
    await postsStore.put({ ...post, status: "posted", postedAt: Date.now(), ...(r.simulated && { simulated: true, ...simulatedPost(post.id) }) });
    await logActivity("marketing", `Published ${aOrAn(post.network)} post`, postRef(post));
  }
  outcome("posts", "social", r, PUBLISH_MODE[post.network][post.format ?? "post"] === "prepare" ? "post-ready" : "post-published");
}

export async function deletePostAction(id: string) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("social");
  const post = await postsStore.get(id);
  await postsStore.remove(id);
  if (post) {
    await logActivity("marketing", `Deleted ${aOrAn(post.network)} post`, postRef(post));
    // A library file stays while a library record or another post still uses it.
    const [library, posts] = await Promise.all([mediaStore.list(), postsStore.list()]);
    for (const src of [...(post.photos ?? []), ...(post.video ? [post.video] : [])]) {
      if (src.startsWith("/media-files/") && !library.some((m) => m.src === src) && !posts.some((p) => p.video === src || p.photos?.includes(src))) await dropMedia(src);
    }
  }
  revalidatePath("/dashboard/marketing");
  go("posts", "deleted");
}

export async function startAdAction(id: string) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("social");
  const a = await adsStore.get(id);
  if (!a || a.status !== "draft") return go("posts", "invalid"); // a draft only: a running ad is never started again
  const r = await startAd(a);
  if (r.ok) {
    await adsStore.put({ ...a, status: "running", startedAt: Date.now(), ...(r.simulated && simulatedAd(a.id)) });
    await logActivity("marketing", `Started a ${a.platform} ad with a ${fmtEur(a.budgetEur)} budget`, adRef(a));
  }
  outcome("posts", "ads", r, "ad-started");
}

export async function deleteAdAction(id: string) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("social");
  const ad = await adsStore.get(id);
  await adsStore.remove(id);
  if (ad) await logActivity("marketing", `Deleted a ${ad.platform} ad`, adRef(ad));
  go("posts", "deleted");
}

// The composer asks for a car's photos and suggested text when the dealer picks it, so the page never carries them for the whole stock.
export async function composerCarAction(slug: string): Promise<ComposerCar | null> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("social");
  const car = (await adminCars()).find((c) => c.slug === slug && forSale(c));
  if (!car) return null;
  const { marketing } = await getSettings();
  const p = priceInfo(car);
  const text = (format: (typeof POST_FORMATS)[number]) => Object.fromEntries(NETWORKS.map((n) => [n, writePost(car, n, marketing, format)])) as ComposerCar["text"];
  return { slug: car.slug, title: carName(car), photos: car.photos.slice(0, 10), text: text("post"), byFormat: Object.fromEntries(POST_FORMATS.map((f) => [f, text(f)])) as ComposerCar["byFormat"], price: p.headline, was: isReduced(car) ? fmtEur(car.wasPriceEur!) : undefined };
}

// "Write from the newest cars" fills the letter from the stock; otherwise the dealer's own subject and text are used.
const letter = z.object({ subject: z.string().trim().max(120), body: z.string().trim().max(4000) });
export async function createNewsletterAction(data: FormData) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("newsletter");
  const { marketing } = await getSettings();
  let { subject, body } = { subject: "", body: "" };
  if (data.get("intent") === "write") {
    const cars = newestForSale(await adminCars(), 5);
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
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("newsletter");
  const n = await newslettersStore.get(id);
  if (!n || n.status !== "draft") return go("newsletters", "invalid");
  const subscribers = (await subscribersStore.list()).filter((x) => x.status === "subscribed").length;
  if (!subscribers) return go("newsletters", "no-subscribers");
  const r = await sendNewsletter(n);
  if (r.ok) {
    await newslettersStore.put({ ...n, status: "sent", sentAt: Date.now(), ...(r.simulated && simulatedLetter(n.id, subscribers)) });
    await logActivity("marketing", "Sent the newsletter", letterRef(n));
  }
  outcome("newsletters", "newsletters", r, "letter-sent");
}

export async function deleteNewsletterAction(id: string) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("newsletter");
  const n = await newslettersStore.get(id);
  await newslettersStore.remove(id);
  if (n) await logActivity("marketing", "Deleted a newsletter", letterRef(n));
  go("newsletters", "deleted");
}

// The media library (#177). One file per call, like a car's photos. The browser has already shrunk a photo to a JPEG and read a video's
// length; the bytes, the size and the length are checked again here. The file is stored first, then the record, so a record never points at nothing.
const dim = z.coerce.number().int().min(1).max(8000).optional();
export async function uploadMediaAction(data: FormData): Promise<{ ok: true; item: MediaItem } | { ok: false; error: string }> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("social");
  const file = data.get("file");
  const bad = { ok: false as const, error: "That file could not be added. Try another." };
  if (!(file instanceof Blob) || file.size === 0 || file.size > MEDIA_LIMITS.videoBytes + 1024) return bad;
  if ((await mediaStore.list()).length >= MEDIA_LIMITS.items) return { ok: false, error: `The library holds ${MEDIA_LIMITS.items} files. Delete some first.` };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const secs = data.get("seconds");
  const seconds = secs ? Number(secs) : undefined;
  const checked = checkUpload(bytes, seconds);
  if (!checked.ok) return checked;
  const size = z.object({ width: dim, height: dim }).safeParse({ width: data.get("width") || undefined, height: data.get("height") || undefined });
  const carSlug = String(data.get("carSlug") ?? "");
  const car = carSlug ? (await adminCars()).find((c) => c.slug === carSlug) : undefined;
  if (carSlug && !car) return bad;
  const name = String(data.get("name") ?? "").split(/[\\/]/).pop()!.replace(/[^\w .()-]/g, "").slice(0, 80) || (checked.kind === "video" ? "Video" : "Photo");
  const item: MediaItem = { id: newId("media"), kind: checked.kind, src: await storeMedia(bytes, checked), name, bytes: bytes.length, ...(size.success && size.data), ...(checked.kind === "video" && { durationSec: Math.round(seconds ?? 0) }), ...(car && { carSlug: car.slug, carTitle: carName(car) }), createdAt: Date.now() };
  await mediaStore.put(item);
  await logActivity("marketing", checked.kind === "video" ? "Added a video to the media library" : "Added a photo to the media library");
  revalidatePath("/dashboard/marketing");
  return { ok: true, item };
}

export async function deleteMediaAction(id: string) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("social");
  const item = await mediaStore.get(id);
  if (!item) return;
  await mediaStore.remove(id);
  // A post that uses the file still needs it, so the file is kept until no post does.
  const used = (await postsStore.list()).some((p) => p.video === item.src || p.photos?.includes(item.src));
  if (!used) await dropMedia(item.src);
  await logActivity("marketing", "Removed a file from the media library");
  revalidatePath("/dashboard/marketing");
}
