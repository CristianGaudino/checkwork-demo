import "server-only";
import { getSettings } from "@/lib/admin/collections";
import { requireEnv } from "@/lib/env";
import { LEAD_FROM_EMAIL } from "@/lib/site";
import { getBindings } from "./bindings";

// Who is told about a lead: the addresses the dealer set in the admin (Settings, Lead emails), else the LEAD_TO_EMAIL variable.
export async function leadRecipients(): Promise<string[]> {
  const set = (await getSettings().catch(() => null))?.leadEmails ?? [];
  if (set.length) return set;
  const env = process.env.LEAD_TO_EMAIL?.trim();
  return env ? [env] : [];
}

// One email per address, so a bad address never stops the others. It fails only when none went (the form then tells the buyer to call).
export async function sendToDealer({ subject, text, replyTo }: { subject: string; text: string; replyTo?: string }): Promise<void> {
  const email = getBindings().EMAIL;
  if (!email) throw new Error("Missing binding EMAIL");
  const to = await leadRecipients();
  if (!to.length) requireEnv("LEAD_TO_EMAIL");
  const sent = await Promise.allSettled(to.map((t) => email.send({ to: t, from: LEAD_FROM_EMAIL, subject, text, ...(replyTo && { replyTo }) })));
  if (!sent.some((r) => r.status === "fulfilled")) throw new Error("No lead email went out");
}
