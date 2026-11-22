import "server-only";
import { requireEnv } from "@/lib/env";
import { LEAD_FROM_EMAIL } from "@/lib/site";
import { getBindings } from "./bindings";

// Who is told about a lead: the LEAD_TO_EMAIL variable.
export function leadRecipients(): string[] {
  const env = process.env.LEAD_TO_EMAIL?.trim();
  return env ? [env] : [];
}

// It fails when the email did not go (the form then tells the buyer to call).
export async function sendToDealer({ subject, text, replyTo }: { subject: string; text: string; replyTo?: string }): Promise<void> {
  const to = leadRecipients();
  if (!to.length) requireEnv("LEAD_TO_EMAIL");
  const email = getBindings().EMAIL;
  if (!email) throw new Error("Missing binding EMAIL");
  await Promise.all(to.map((t) => email.send({ to: t, from: LEAD_FROM_EMAIL, subject, text, ...(replyTo && { replyTo }) })));
}
