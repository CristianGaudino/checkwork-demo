"use client";

import { useActionState, useState } from "react";
import { Select } from "@/components/Select";
import { Field, adminButton, adminInput } from "@/components/admin/kit";
import { BuyerFields } from "@/components/admin/BuyerFields";
import { endReservationAction, reserveAction, undoSaleAction, type DepositFormState } from "@/app/dashboard/stock/actions";
import { DEPOSIT_METHODS } from "@/lib/admin/deposits";

// The forms around a sale that is not a plain sale: a deposit taken, a reservation ended, a sale undone. The server checks every box again.
const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
const full = "sm:col-span-2 lg:col-span-3";
const textarea = `${adminInput} h-auto min-h-24 py-2`;

function Choice({ name, options, value, onChange, legend, error }: { name: string; options: [string, string][]; value: string; onChange: (v: string) => void; legend: string; error?: string }) {
  return (
    <fieldset className={`flex flex-col gap-2 ${full}`}>
      <legend className="mb-1 text-meta font-medium">{legend}</legend>
      {options.map(([v, label]) => (
        <label key={v} className="flex min-h-11 items-center gap-3 text-body">
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="size-5 accent-accent" />
          {label}
        </label>
      ))}
      {error && <p className="text-meta text-bad">{error}</p>}
    </fieldset>
  );
}

export function ReserveForm({ carId, today, latest, team, me, customers }: { carId: string; today: string; latest: string; team: string[]; me?: string; customers: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState<DepositFormState, FormData>(reserveAction.bind(null, carId), undefined);
  const e = state?.errors ?? {};
  return (
    <form action={action} className={grid} noValidate>
      <Field label="Deposit (€)" error={e.depositEur}>
        <input name="depositEur" inputMode="numeric" className={adminInput} />
      </Field>
      <Field label="Paid by" error={e.method}>
        <Select name="method" defaultValue="Card" options={DEPOSIT_METHODS.map((m) => [m, m] as const)} />
      </Field>
      <Field label="Day it was paid" error={e.paidOn}>
        <input name="paidOn" type="date" max={today} defaultValue={today} className={adminInput} />
      </Field>
      <Field label="Held until" hint="The last day the car is kept for them" error={e.until}>
        <input name="until" type="date" min={today} max={latest} className={adminInput} />
      </Field>
      <Field label="Taken by" error={e.salesperson}>
        <Select name="salesperson" defaultValue={me ?? ""} options={[["", "Not set"], ...team.map((t) => [t, t] as const)]} />
      </Field>
      <BuyerFields customers={customers} errors={e} />
      <div className={full}>
        <button type="submit" disabled={pending} className={adminButton}>{pending ? "Saving" : "Take deposit"}</button>
      </div>
    </form>
  );
}

export function EndReservationForm({ carId, depositEur }: { carId: string; depositEur: number }) {
  const [state, action, pending] = useActionState<DepositFormState, FormData>(endReservationAction.bind(null, carId), undefined);
  const [outcome, setOutcome] = useState("refunded");
  const e = state?.errors ?? {};
  return (
    <form action={action} className={grid} noValidate>
      <Choice name="outcome" legend="The deposit was" value={outcome} onChange={setOutcome} error={e.outcome} options={[["refunded", "Refunded"], ["kept", "Kept, under our terms"]]} />
      {outcome === "refunded" && (
        <Field label="Refunded (€)" error={e.refundEur}>
          <input name="refundEur" inputMode="numeric" defaultValue={depositEur} className={adminInput} />
        </Field>
      )}
      <div className={full}>
        <button type="submit" disabled={pending} className={adminButton}>{pending ? "Saving" : "End reservation"}</button>
      </div>
    </form>
  );
}

export function UndoSaleForm({ carId, soldOn, today }: { carId: string; soldOn: string; today: string }) {
  const [state, action, pending] = useActionState<DepositFormState, FormData>(undoSaleAction.bind(null, carId), undefined);
  const [kind, setKind] = useState("returned");
  const e = state?.errors ?? {};
  return (
    <form action={action} className={grid} noValidate>
      <Choice
        name="kind"
        legend="What happened"
        value={kind}
        onChange={setKind}
        error={e.kind}
        options={[["returned", "The buyer brought it back"], ["cancelled", "The sale fell through before they took it"]]}
      />
      <Field label={kind === "returned" ? "Day it came back" : "Day it fell through"} error={e.returnedOn}>
        <input name="returnedOn" type="date" min={soldOn} max={today} defaultValue={today} className={adminInput} />
      </Field>
      <Field label="Refunded (€)" hint={kind === "returned" ? "0 if nothing" : "Leave empty if nothing was paid"} error={e.refundEur}>
        <input name="refundEur" inputMode="numeric" className={adminInput} />
      </Field>
      <Field label={kind === "returned" ? "Why it came back" : "Why (optional)"} error={e.reason} className={full}>
        <textarea name="reason" maxLength={300} className={textarea} />
      </Field>
      <div className={full}>
        <button type="submit" disabled={pending} className={adminButton}>{pending ? "Saving" : kind === "returned" ? "Take it back" : "Cancel the sale"}</button>
      </div>
    </form>
  );
}
