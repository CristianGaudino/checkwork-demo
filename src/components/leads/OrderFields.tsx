"use client";

import { MAKE_OPTIONS } from "@/lib/leads/makes";
import { LIMITS } from "@/lib/leads/constants";
import { irishToday, regPeriodLabel, regPeriods } from "@/lib/leads/reg-periods";
import { ContactFields, Field } from "./Field";
import type { FieldBinding } from "./LeadForm";

// A new car ordered from the factory: the car, the spec, when they'd like it, then contact. One page: it is short.
export function OrderFields({ bind }: { bind(name: string): FieldBinding }) {
  const periods = [{ value: "", label: "Choose" }, ...regPeriods(irishToday()).map((p) => ({ value: p, label: regPeriodLabel(p) }))];
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field {...bind("make")} label="Make" required options={[{ value: "", label: "Choose" }, ...MAKE_OPTIONS.slice(1)]} />
        <Field {...bind("model")} label="Model" required maxLength={60} enterKeyHint="next" />
      </div>
      <Field {...bind("spec")} label="Trim, engine or colour (optional)" maxLength={120} enterKeyHint="next" />
      <Field {...bind("regPeriod")} label="Registration you'd like" required options={periods} />
      <Field {...bind("message")} label="Anything else (optional)" multiline maxLength={LIMITS.message} />
      <ContactFields bind={bind} />
    </>
  );
}
