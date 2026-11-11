"use client";

import { GeneralFields } from "./GeneralFields";
import { LeadForm } from "./LeadForm";
import { SOURCING_STEPS, SourcingFields } from "./SourcingFields";
import { TRADE_IN_STEPS, TRADE_STEPS, TradeInFields } from "./TradeInFields";

// LeadForm takes its fields as a render function, which a server page cannot pass, so pages name the form and this picks the fields.
// "sell" and "trade" are the two doors to the one valuation (lead type trade_in); `cars` is what a trade-in can be against, as [id, name].
type Form = "general" | "sourcing" | "sell" | "trade";
const TYPE = { general: "general", sourcing: "sourcing", sell: "trade_in", trade: "trade_in" } as const;
const STEPS = { general: undefined, sourcing: SOURCING_STEPS, sell: TRADE_IN_STEPS, trade: TRADE_STEPS };

export function LeadPageForm({ form, cars = [], ...props }: { form: Form; cars?: [string, string][]; submitLabel: string; success: { heading: string; body: string }; prefill?: Record<string, string> }) {
  return (
    <LeadForm type={TYPE[form]} variant="page" back={form === "general" ? { href: "/", label: "Back to home" } : undefined} steps={STEPS[form]} {...props}>
      {(f) => (form === "general" ? <GeneralFields {...f} /> : form === "sourcing" ? <SourcingFields {...f} /> : <TradeInFields {...f} mode={form} cars={cars} />)}
    </LeadForm>
  );
}
