"use client";

import { LIMITS } from "@/lib/leads/constants";
import { ContactFields, Field } from "./Field";
import type { FieldBinding } from "./LeadForm";

// /contact, /service and /warranty: the message first, then contact. `label` asks for what that page needs.
export function GeneralFields({ bind, label = "How can we help?" }: { bind(name: string): FieldBinding; label?: string }) {
  return (
    <>
      <Field {...bind("message")} label={label} required multiline maxLength={LIMITS.message} />
      <ContactFields bind={bind} />
    </>
  );
}
