import "server-only";
import { modeOf } from "@/lib/integrations";
import { recordUsage, usageAllowed } from "@/lib/billing/usage";
import { addMessage, type Msg } from "./store";
import { channelFor } from "./rules";

// The one place a message leaves the site for WhatsApp (#178). Like the other outward services (src/lib/admin/publishers.ts) it is simulated
// on the demo: the message is recorded in the conversation and nothing goes outside. Every paid message checks the cap first and counts
// itself after (src/lib/billing/usage.ts); past the cap an alert or a reply goes by email and is not counted as WhatsApp, and a marketing
// message is not sent at all.
//
// ADAPTER GOES HERE: the WhatsApp Business Platform (Cloud API), POST /{WHATSAPP_PHONE_NUMBER_ID}/messages with WHATSAPP_ACCESS_TOKEN.
// - Outside the 24 hours after the person last wrote, only an approved template can be sent (one per event in rules.ts, submitted per
//   dealer, with the buttons as quick replies); inside it, free text and interactive reply buttons (three at most: a longer list is a list message).
// - The webhook route must check X-Hub-Signature-256 (HMAC SHA-256 of the raw body with WHATSAPP_APP_SECRET) and ignore anything unsigned
//   or from a number that is not a linked staff phone (staffStore) or a lead's own number.
// - The buyer's email fallback goes through the lead mailer (src/lib/leads/mail.ts).
export type Draft = Omit<Msg, "id" | "at" | "via"> & { at?: number };

// `email`: the person chose email (a buyer who did not tick the WhatsApp box), so it never counts as WhatsApp.
// `canEmail` false: there is no address to fall back to, so when WhatsApp cannot send, nothing is sent (null) rather than an email nobody gets.
export async function sendWhatsApp(draft: Draft, kind: "alert" | "reply" | "marketing", { email = false, canEmail = true }: { email?: boolean; canEmail?: boolean } = {}): Promise<Msg | null> {
  // Only a simulated service sends here until the adapter exists, so a connected one with no adapter falls back too, never pretends.
  const channel = email ? "email" : channelFor(kind, modeOf("whatsapp") === "simulated", await usageAllowed("whatsapp", kind));
  if (channel === "none" || (channel === "email" && !canEmail)) return null;
  if (channel === "whatsapp") await recordUsage("whatsapp", kind);
  return addMessage({ ...draft, ...(channel === "email" && { via: "email" as const }) });
}
