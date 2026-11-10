"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { NETWORKS, adsStore, getSettings, newslettersStore, postsStore, subscribersStore, type Network } from "@/lib/admin/collections";
import { simulatedAd, simulatedLetter, simulatedPost, writeNewsletter, writePost, type SendResult } from "@/lib/admin/marketing";
import { publishPost, sendNewsletter, startAd } from "@/lib/admin/publishers";
import { adminCars } from "@/lib/admin/stock-admin";
import { carName } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";

// A result goes back to the page as a short code, never as text from the request, so the page can only ever say what it knows.
const go = (tab: string, notice: string): never => redirect(`/admin/marketing?tab=${tab}&notice=${notice}`);
const outcome = (tab: string, r: SendResult, ok: string) => go(tab, r.ok ? ok : r.reason === "not-connected" ? `${tab}-not-connected` : `${tab}-not-installed`);

const draftPost = z.object({ carSlug: z.string().min(1), network: z.enum(NETWORKS) });
export async function createPostAction(data: FormData) {
  const r = draftPost.safeParse(Object.fromEntries(data));
  const car = r.success ? (await adminCars()).find((c) => c.slug === r.data.carSlug) : undefined;
  if (!r.success || !car) return go("social", "invalid");
  const { marketing } = await getSettings();
  await postsStore.put({ id: `post-${Date.now()}`, network: r.data.network as Network, carSlug: car.slug, carTitle: carName(car), text: writePost(car, r.data.network, marketing), status: "draft", createdAt: Date.now() });
  go("social", "post-created");
}

export async function savePostAction(id: string, data: FormData) {
  const text = String(data.get("text") ?? "").trim().slice(0, 1000);
  const post = await postsStore.get(id);
  if (!post || !text) return go("social", "invalid");
  await postsStore.put({ ...post, text });
  go("social", "post-saved");
}

export async function schedulePostAction(id: string, data: FormData) {
  const when = new Date(String(data.get("when") ?? "")).getTime();
  const post = await postsStore.get(id);
  if (!post || Number.isNaN(when) || when < Date.now()) return go("social", "invalid-time");
  await postsStore.put({ ...post, status: "scheduled", scheduledFor: when });
  go("social", "post-scheduled");
}

export async function publishPostAction(id: string) {
  const post = await postsStore.get(id);
  if (!post) return go("social", "invalid");
  const r = await publishPost(post);
  if (r.ok) await postsStore.put({ ...post, status: "posted", postedAt: Date.now(), ...(r.simulated && { simulated: true, ...simulatedPost(post.id) }) });
  outcome("social", r, "post-published");
}

export async function deletePostAction(id: string) {
  await postsStore.remove(id);
  revalidatePath("/admin/marketing");
  go("social", "deleted");
}

const ad = z.object({ name: z.string().trim().min(1).max(80), platform: z.enum(["Meta", "Google"]), carSlug: z.string().min(1), budgetEur: z.coerce.number().int().min(20).max(5000) });
export async function createAdAction(data: FormData) {
  const r = ad.safeParse(Object.fromEntries(data));
  const car = r.success ? (await adminCars()).find((c) => c.slug === r.data.carSlug) : undefined;
  if (!r.success || !car) return go("ads", "invalid");
  await adsStore.put({ id: `ad-${Date.now()}`, name: r.data.name, platform: r.data.platform, carTitle: carName(car), budgetEur: r.data.budgetEur, status: "draft", impressions: 0, clicks: 0, leads: 0, createdAt: Date.now() });
  go("ads", "ad-created");
}

export async function startAdAction(id: string) {
  const a = await adsStore.get(id);
  if (!a) return go("ads", "invalid");
  const r = await startAd(a);
  if (r.ok) await adsStore.put({ ...a, status: "running", ...(r.simulated && simulatedAd(a.id)) });
  outcome("ads", r, "ad-started");
}

export async function deleteAdAction(id: string) {
  await adsStore.remove(id);
  go("ads", "deleted");
}

// "Write from the newest cars" fills the letter from the stock; otherwise the dealer's own subject and text are used.
const letter = z.object({ subject: z.string().trim().max(120), body: z.string().trim().max(4000) });
export async function createNewsletterAction(data: FormData) {
  const { marketing } = await getSettings();
  let { subject, body } = { subject: "", body: "" };
  if (data.get("intent") === "write") {
    const cars = (await adminCars()).filter((c) => !isSold(c)).sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 5);
    ({ subject, body } = writeNewsletter(cars, marketing));
  } else {
    const r = letter.safeParse(Object.fromEntries(data));
    if (!r.success || !r.data.subject || !r.data.body) return go("newsletters", "invalid");
    ({ subject, body } = r.data);
  }
  await newslettersStore.put({ id: `nl-${Date.now()}`, subject, body, status: "draft", createdAt: Date.now() });
  go("newsletters", "letter-created");
}

export async function sendNewsletterAction(id: string) {
  const n = await newslettersStore.get(id);
  if (!n || n.status !== "draft") return go("newsletters", "invalid");
  const r = await sendNewsletter(n);
  if (r.ok) await newslettersStore.put({ ...n, status: "sent", sentAt: Date.now(), ...(r.simulated && simulatedLetter(n.id, (await subscribersStore.list()).filter((x) => x.status === "subscribed").length)) });
  outcome("newsletters", r, "letter-sent");
}

export async function deleteNewsletterAction(id: string) {
  await newslettersStore.remove(id);
  go("newsletters", "deleted");
}
