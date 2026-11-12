"use client";

import { useState } from "react";
import { Select } from "@/components/Select";
import { Field, adminInput } from "@/components/admin/kit";

// Who is buying: a customer on file, or a new one (name, and a phone or an email). On the sale and the deposit forms; the server checks it.
export function BuyerFields({ customers, defaultId, errors }: { customers: { id: string; label: string }[]; defaultId?: string; errors: Record<string, string> }) {
  const [customer, setCustomer] = useState(defaultId ?? "");
  return (
    <>
      <Field label="Buyer" error={errors.customerId} className="sm:col-span-2 lg:col-span-3">
        <Select name="customerId" value={customer} onChange={setCustomer} options={[["", "A new customer"], ...customers.map((c) => [c.id, c.label] as const)]} />
      </Field>
      {customer === "" && (
        <>
          <Field label="Name" error={errors.name}>
            <input name="name" className={adminInput} autoComplete="off" />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <input name="phone" type="tel" className={adminInput} autoComplete="off" />
          </Field>
          <Field label="Email (optional)" error={errors.email}>
            <input name="email" type="email" className={adminInput} autoComplete="off" />
          </Field>
        </>
      )}
    </>
  );
}
