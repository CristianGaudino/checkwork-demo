"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addRequest, feedbackStore, storeScreenshot } from "@/lib/admin/help";
import { newId } from "@/lib/admin/ids";
import { parseRequest, safeFrom } from "@/lib/admin/help-rules";
import { currentMember } from "@/lib/permissions";
import { requireStaff } from "@/lib/staff";

export type HelpState = { errors?: Record<string, string>; saved?: boolean } | undefined;

// Any team member may write to us. The type, the page they came from and the screenshot are all checked here, whatever the form sent.
export async function sendHelpAction(_p: HelpState, data: FormData): Promise<HelpState> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  const me = await currentMember();
  const r = parseRequest((k) => String(data.get(k) ?? ""), me.role);
  if (!r.value) return { errors: r.errors };
  let screenshot: string | undefined;
  const file = data.get("screenshot");
  if (r.value.type === "Something isn't working" && file instanceof Blob && file.size > 0) {
    screenshot = (await storeScreenshot(newId("shot"), file)) ?? undefined;
    if (!screenshot) return { errors: { screenshot: "Use a picture (JPG, PNG or WebP) under 3 MB" } };
  }
  await addRequest({ ...r.value, ...(screenshot && { screenshot }), from: safeFrom(data.get("from")), name: me.name, role: me.role ?? "" });
  revalidatePath("/dashboard/help");
  return { saved: true };
}

// Quick feedback: a score of 1 to 5 and an optional line; "Not now" is stored as 0. Either way it is not asked again for a quarter.
const feedback = z.object({ score: z.coerce.number().int().min(0).max(5), note: z.string().trim().max(500) });
export async function sendFeedbackAction(data: FormData) {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  const me = await currentMember();
  const r = feedback.safeParse({ score: data.get("skip") ? 0 : data.get("score"), note: data.get("note") ?? "" });
  if (!r.success || !me.name) return;
  await feedbackStore.put({ id: me.name.toLowerCase(), at: Date.now(), score: r.data.score, ...(r.data.note && r.data.score && { note: r.data.note }) });
  revalidatePath("/dashboard/help");
}
