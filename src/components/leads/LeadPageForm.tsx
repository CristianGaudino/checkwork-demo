"use client";

import type { TopicId } from "@/lib/leads/contact-topics";
import { CONTACT_STEPS, GeneralFields } from "./GeneralFields";
import { OrderFields } from "./OrderFields";
import { LeadForm } from "./LeadForm";
import { SOURCING_STEPS, SourcingFields } from "./SourcingFields";
import { TRADE_IN_STEPS, TRADE_STEPS, TradeInFields } from "./TradeInFields";

// LeadForm takes its fields as a render function, which a server page cannot pass, so pages name the form and this picks the fields.
// "sell" and "trade" are the two doors to the one valuation (lead type trade_in); `cars` is what a trade-in can be against, as [id, name].
// "general" is the guided contact form; "warranty" and "service" are the same form opened on its topic, which the dashboard files by topic.
type Form = "general" | "warranty" | "service" | "order" | "sourcing" | "sell" | "trade";
const TYPE = { general: "general", warranty: "general", service: "general", order: "order", sourcing: "sourcing", sell: "trade_in", trade: "trade_in" } as const;
const TOPIC: Partial<Record<Form, TopicId>> = { warranty: "bought", service: "service" };
const TOPIC_PREFILL = { bought: { topic: "bought" }, service: { topic: "service" } }; // one object each: LeadForm compares prefill by identity
const STEPS = { general: CONTACT_STEPS, warranty: CONTACT_STEPS.slice(1), service: CONTACT_STEPS.slice(1), order: undefined, sourcing: SOURCING_STEPS, sell: TRADE_IN_STEPS, trade: TRADE_STEPS };

export function LeadPageForm({ form, cars = [], prefill, ...props }: { form: Form; cars?: [string, string][]; submitLabel: string; success: { heading: string; body: string }; prefill?: Record<string, string> }) {
  return (
    <LeadForm type={TYPE[form]} variant="page" back={form === "general" ? { href: "/", label: "Back to home" } : undefined} steps={STEPS[form]} prefill={prefill ?? (form === "warranty" ? TOPIC_PREFILL.bought : form === "service" ? TOPIC_PREFILL.service : undefined)} {...props}>
      {(f) => (form === "general" || form === "warranty" || form === "service" ? <GeneralFields {...f} cars={cars} fixed={TOPIC[form]} /> : form === "order" ? <OrderFields {...f} /> : form === "sourcing" ? <SourcingFields {...f} /> : <TradeInFields {...f} mode={form} cars={cars} />)}
    </LeadForm>
  );
}
