"use client";

import { useActionState } from "react";
import { Select } from "@/components/Select";
import { Field, adminButton, adminInput } from "@/components/admin/kit";
import { BuyerFields } from "@/components/admin/BuyerFields";
import { recordSaleAction, type SaleFormState } from "@/app/dashboard/stock/actions";

// The sale of one car: price, day, salesperson, and the buyer (a customer on file, or a new one). The server checks every box again.
export type SaleDefaults = { priceEur: number; soldOn: string; salesperson?: string; customerId?: string };
export function SaleForm({ carId, defaults, today, team, customers, submit }: { carId: string; defaults: SaleDefaults; today: string; team: string[]; customers: { id: string; label: string }[]; submit: string }) {
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
      <div className="sm:col-span-2 lg:col-span-3">
        <button type="submit" disabled={pending} className={adminButton}>
          {pending ? "Saving" : submit}
        </button>
      </div>
    </form>
  );
}
