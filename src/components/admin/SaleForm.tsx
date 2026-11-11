"use client";

import { useActionState, useState } from "react";
import { Select } from "@/components/Select";
import { Field, adminButton, adminInput } from "@/components/admin/kit";
import { recordSaleAction, type SaleFormState } from "@/app/dashboard/stock/actions";

// The sale of one car: price, day, salesperson, and the buyer (a customer on file, or a new one). The server checks every box again.
export type SaleDefaults = { priceEur: number; soldOn: string; salesperson?: string; customerId?: string };
export function SaleForm({ carId, defaults, today, team, customers, submit }: { carId: string; defaults: SaleDefaults; today: string; team: string[]; customers: { id: string; label: string }[]; submit: string }) {
  const [state, action, pending] = useActionState<SaleFormState, FormData>(recordSaleAction.bind(null, carId), undefined);
  const [customer, setCustomer] = useState(defaults.customerId ?? "");
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
      <Field label="Buyer" error={e.customerId} className="sm:col-span-2 lg:col-span-3">
        <Select name="customerId" value={customer} onChange={setCustomer} options={[["", "A new customer"], ...customers.map((c) => [c.id, c.label] as const)]} />
      </Field>
      {customer === "" && (
        <>
          <Field label="Name" error={e.name}>
            <input name="name" className={adminInput} autoComplete="off" />
          </Field>
          <Field label="Phone" error={e.phone}>
            <input name="phone" type="tel" className={adminInput} autoComplete="off" />
          </Field>
          <Field label="Email (optional)" error={e.email}>
            <input name="email" type="email" className={adminInput} autoComplete="off" />
          </Field>
        </>
      )}
      <div className="sm:col-span-2 lg:col-span-3">
        <button type="submit" disabled={pending} className={adminButton}>
          {pending ? "Saving" : submit}
        </button>
      </div>
    </form>
  );
}
