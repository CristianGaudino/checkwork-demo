"use client";

import { EMPLOYMENT, LIMITS } from "@/lib/leads/constants";
import { FINANCE, PRODUCT_LABELS } from "@/lib/finance/finance.config";
import { ContactFields, Field } from "./Field";
import type { FieldBinding } from "./LeadForm";

// The calculator's too. PCP has its own terms.
export const termOptions = (product?: string) => ((product === "pcp" && FINANCE.pcp?.terms) || FINANCE.terms).map((t) => ({ value: String(t), label: `${t} months` }));
const PRODUCTS = Object.entries(PRODUCT_LABELS).map(([value, label]) => ({ value, label }));
const JOBS = [{ value: "", label: "Choose one" }, ...Object.entries(EMPLOYMENT).map(([value, label]) => ({ value, label }))];

// The finance application in UI-SPEC order (D-17): contact, the type of finance (with PCP on), deposit and term from the calculator, employment, message.
export function FinanceFields({ bind }: { bind(name: string): FieldBinding }) {
  return (
    <>
      <ContactFields bind={bind} />
      {FINANCE.pcp && <Field {...bind("product")} label="Type of finance" required options={PRODUCTS} />}
      <Field {...bind("deposit")} label="Deposit" required prefix="€" inputMode="numeric" autoComplete="off" enterKeyHint="next" />
      <Field {...bind("term")} label="Term" required options={termOptions(bind("product").value)} />
      <p className="text-meta text-text-2">We don&apos;t ask for income, date of birth or bank details.</p>
      <Field {...bind("employment")} label="Employment status" required options={JOBS} />
      <Field {...bind("message")} label="Anything else we should know?" optional multiline maxLength={LIMITS.message} />
    </>
  );
}
