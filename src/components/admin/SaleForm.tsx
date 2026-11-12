"use client";

import { useActionState } from "react";
import { Select } from "@/components/Select";
import { Field, adminButton, adminInput } from "@/components/admin/kit";
import { BuyerFields } from "@/components/admin/BuyerFields";
import { recordSaleAction, type SaleFormState } from "@/app/dashboard/stock/actions";
import { COVER_CHOICES, COVER_MONTHS } from "@/lib/admin/deposits";

// The sale of one car: price, day, salesperson, and the buyer (a customer on file, or a new one). The server checks every box again.
// `leads`: this car's leads, to say which one it came from (it is marked won).
export type SaleDefaults = { priceEur: number; soldOn: string; salesperson?: string; customerId?: string; coverMonths?: number; tradeIn?: { reg: string; allowanceEur: number }; leadId?: string };
export function SaleForm({ carId, defaults, today, team, customers, leads, submit }: { carId: string; defaults: SaleDefaults; today: string; team: string[]; customers: { id: string; label: string }[]; leads: { id: string; label: string }[]; submit: string }) {
  const [state, action, pending] = useActionState<SaleFormState, FormData>(recordSaleAction.bind(null, carId), undefined);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" noValidate>
      <Field label="Sale price (€)" error={e.priceEur}>
        <input name="priceEur" inputMode="numeric" defaultValue={defaults.priceEur} className={adminInput} />
      </Field>
      <Field label="Day it sold" error={e.soldOn}>
        <input name="soldOn" type="date" max={today} defaultValue={defaults.soldOn} className={adminInput} />
      </Field>
      <Field label="Sold by" error={e.salesperson}>
        <Select name="salesperson" defaultValue={defaults.salesperson ?? ""} options={[["", "Not set"], ...team.map((t) => [t, t] as const)]} />
      </Field>
      <BuyerFields customers={customers} defaultId={defaults.customerId} errors={e} />
      <Field label="Warranty" error={e.coverMonths}>
        <Select name="coverMonths" defaultValue={String(defaults.coverMonths ?? COVER_MONTHS)} options={COVER_CHOICES.map((m) => [String(m), m === COVER_MONTHS ? `${m} months, included` : `${m} months, extended`] as const)} />
      </Field>
      <Field label="Trade-in registration (optional)" error={e.tradeReg}>
        <input name="tradeReg" defaultValue={defaults.tradeIn?.reg} autoCapitalize="characters" className={adminInput} autoComplete="off" />
      </Field>
      <Field label="Trade-in allowance (€)" error={e.tradeEur}>
        <input name="tradeEur" inputMode="numeric" defaultValue={defaults.tradeIn?.allowanceEur} className={adminInput} />
      </Field>
      {leads.length > 0 && (
        <Field label="From the lead (optional)" hint="It is marked won" error={e.leadId} className="sm:col-span-2 lg:col-span-3">
          <Select name="leadId" defaultValue={defaults.leadId ?? ""} options={[["", "None"], ...leads.map((l) => [l.id, l.label] as const)]} />
        </Field>
      )}
      <div className="sm:col-span-2 lg:col-span-3">
        <button type="submit" disabled={pending} className={adminButton}>
          {pending ? "Saving" : submit}
        </button>
      </div>
    </form>
  );
}
