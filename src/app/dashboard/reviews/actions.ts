"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/admin/activity";
import { reviewsStore } from "@/lib/admin/collections";

export async function replyAction(id: string, data: FormData) {
  const reply = String(data.get("reply") ?? "").trim().slice(0, 500);
  const review = await reviewsStore.get(id);
  if (!review || reply === (review.reply ?? "")) return; // nothing changed
  // An empty box removes the reply.
  await reviewsStore.put(reply ? { ...review, reply, repliedAt: Date.now() } : { ...review, reply: undefined, repliedAt: undefined });
  await logActivity("reviews", reply ? (review.reply ? "Changed the reply to the review" : "Replied to the review") : "Removed the reply to the review", { kind: "review", id });
  revalidatePath("/dashboard/reviews");
}

export async function flagAction(id: string) {
  const review = await reviewsStore.get(id);
  if (!review) return;
  await reviewsStore.put({ ...review, flagged: !review.flagged });
  await logActivity("reviews", review.flagged ? "Unflagged the review" : "Flagged the review", { kind: "review", id });
  revalidatePath("/dashboard/reviews");
}
