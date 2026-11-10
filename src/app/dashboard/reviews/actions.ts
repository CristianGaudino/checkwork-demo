"use server";

import { revalidatePath } from "next/cache";
import { reviewsStore } from "@/lib/admin/collections";

export async function replyAction(id: string, data: FormData) {
  const reply = String(data.get("reply") ?? "").trim().slice(0, 500);
  const review = await reviewsStore.get(id);
  if (!review) return;
  // An empty box removes the reply.
  await reviewsStore.put(reply ? { ...review, reply, repliedAt: Date.now() } : { ...review, reply: undefined, repliedAt: undefined });
  revalidatePath("/dashboard/reviews");
}

export async function flagAction(id: string) {
  const review = await reviewsStore.get(id);
  if (!review) return;
  await reviewsStore.put({ ...review, flagged: !review.flagged });
  revalidatePath("/dashboard/reviews");
}
