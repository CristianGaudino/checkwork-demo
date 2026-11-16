"use server";

import { z } from "zod";
import { usageAllowed, recordUsage } from "@/lib/billing/usage";
import { requireModule } from "@/lib/modules";
import { SITE_NAME } from "@/lib/site";
import { POST_FORMATS, STORY_LAYOUTS, NETWORKS } from "@/lib/admin/networks";
import { buildFacts } from "./facts";
import { ADJUSTS, adjustsFor, maskContacts, unmaskContacts, type Adjust, type WriteRequest, type WriteResult } from "./tasks";
import { writeWithAI } from "./write";
import { requireStaff } from "@/lib/staff";

const request = z.discriminatedUnion("task", [
  z.object({ task: z.literal("post"), carSlug: z.string().max(200), network: z.enum(NETWORKS), format: z.enum(POST_FORMATS), layout: z.enum(STORY_LAYOUTS).optional() }),
  z.object({ task: z.literal("newsletter") }),
  z.object({ task: z.literal("carDescription"), fields: z.record(z.string().max(60), z.string().max(4000)) }),
  z.object({ task: z.literal("leadReply"), leadId: z.string().max(80) }),
  z.object({ task: z.literal("reviewReply"), reviewId: z.string().max(80) }),
]);

// Called by the writing buttons. Order matters: the module (a dealer without AI gets nothing), then the monthly cap (past it the text is
// left alone and the button says so), then the writer, then the count, so a failed write is never billed.
export async function writeAction(req: WriteRequest, adjust?: Adjust, current = ""): Promise<WriteResult> {
  await requireStaff(); // a server action can be posted to any page: only staff Access let in (src/lib/staff.ts)
  await requireModule("ai");
  const parsed = request.safeParse(req);
  if (!parsed.success) return { ok: false, reason: "failed" };
  if (adjust && !(Object.hasOwn(ADJUSTS, adjust) && adjustsFor(parsed.data.task).includes(adjust))) return { ok: false, reason: "failed" };
  if (!(await usageAllowed("ai"))) return { ok: false, reason: "limit" };
  const built = await buildFacts(parsed.data as WriteRequest, SITE_NAME);
  if (!built) return { ok: false, reason: "failed" };
  // The dealer's draft too: no phone or email reaches the AI provider, and theirs go back into the answer.
  const masked = maskContacts(current.slice(0, 4000));
  const r = await writeWithAI(built.task, built.facts as never, adjust, masked.text);
  if (!r.ok) return { ok: false, reason: "failed" };
  await recordUsage("ai", adjust ? "adjust" : "draft");
  return { ...r, text: unmaskContacts(r.text, masked) };
}
