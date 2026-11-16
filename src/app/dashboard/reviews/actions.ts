"use server";

import { redirect } from "next/navigation";
import { logActivity } from "@/lib/admin/activity";
import { reviewsStore } from "@/lib/admin/collections";
import { postReviewReply } from "@/lib/admin/publishers";
import { requireStaff } from "@/lib/staff";

// A reply goes to Google first (Business Profile, simulated on the demo), and is kept here only once Google has it, so the dashboard never
// shows a reply the customer cannot see. An empty box removes the reply. The answer comes back as a short code the page knows.
export async function replyAction(id: string, data: FormData) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  const reply = String(data.get("reply") ?? "").trim().slice(0, 500);
  const review = await reviewsStore.get(id);
  if (!review || reply === (review.reply ?? "")) return; // nothing changed
  const sent = await postReviewReply(review, reply);
  if (!sent.ok) redirect(`/dashboard/reviews?notice=${sent.reason}`);
  await reviewsStore.put(reply ? { ...review, reply, repliedAt: Date.now() } : { ...review, reply: undefined, repliedAt: undefined });
  await logActivity("reviews", reply ? (review.reply ? "Changed the reply to the review" : "Replied to the review") : "Removed the reply to the review", { kind: "review", id });
  redirect(`/dashboard/reviews?notice=${reply ? "reply-posted" : "reply-removed"}`);
}
