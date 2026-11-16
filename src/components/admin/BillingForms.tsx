"use client";

import { useActionState } from "react";
import { Select } from "@/components/Select";
import { Field, adminButton, adminInput } from "@/components/admin/kit";
import { addAlertAction, saveDetailsAction, saveLimitsAction, type BillingState } from "@/app/dashboard/billing/actions";
import type { Scope } from "@/lib/billing/rules";
import { eur, scopeName, type BillingDetails } from "@/lib/billing/bills-rules";

type Action = (prev: BillingState, data: FormData) => Promise<BillingState>;
function useSave(action: Action) {
  const [state, run, pending] = useActionState<BillingState, FormData>(action, undefined);
  return { state, run, pending, errors: state?.errors ?? {} };
}
function Save({ pending, saved, label = "Save" }: { pending: boolean; saved?: boolean; label?: string }) {
  return (
    <div className="flex items-center gap-4">
      <button type="submit" disabled={pending} className={adminButton}>
        {pending ? "Saving" : label}
      </button>
      {saved && !pending && (
        <p role="status" className="text-meta text-ok">
          Saved
        </p>
      )}
    </div>
  );
}

// A monthly limit for each service and for all usage together. Blank is no limit. `ceilings` are ours: shown, and the server holds to them.
export function LimitsForm({ scopes, caps, ceilings, alertAt80 }: { scopes: Scope[]; caps: Partial<Record<Scope, number>>; ceilings: Partial<Record<Scope, number>>; alertAt80: boolean }) {
  const f = useSave(saveLimitsAction);
  return (
    <form action={f.run} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {scopes.map((s) => {
          const ceiling = ceilings[s];
          return (
            <Field key={s} label={`${scopeName(s)} limit (€ a month)`} hint={ceiling !== undefined ? `Our limit for your account: ${eur(ceiling)}` : "Leave empty for no limit"} error={f.errors[`cap-${s}`]}>
              <input name={`cap-${s}`} inputMode="decimal" defaultValue={caps[s] ?? ""} className={adminInput} />
            </Field>
          );
        })}
      </div>
      <label className="flex min-h-11 items-center gap-3 text-body">
        <input type="checkbox" name="alertAt80" defaultChecked={alertAt80} className="size-5" />
        Tell me when usage reaches 80% of a limit
      </label>
      {f.errors.form && <p role="alert" className="text-meta text-destructive">{f.errors.form}</p>}
      <Save pending={f.pending} saved={f.state?.saved} label="Save limits" />
    </form>
  );
}

export function AlertForm({ scopes }: { scopes: Scope[] }) {
  const f = useSave(addAlertAction);
  return (
    <form action={f.run} className="flex flex-wrap items-end gap-3" noValidate>
      <Field label="Tell me when" className="min-w-48">
        <Select name="scope" options={scopes.map((s) => [s, scopeName(s)] as const)} defaultValue={scopes[0]} label="Tell me when" />
      </Field>
      <Field label="passes (€)" error={f.errors.alert} className="w-32">
        <input name="amount" inputMode="decimal" className={adminInput} />
      </Field>
      <button type="submit" disabled={f.pending} className={adminButton}>
        {f.pending ? "Adding" : "Add alert"}
      </button>
    </form>
  );
}

export function DetailsForm({ details, editable }: { details: BillingDetails; editable: boolean }) {
  const f = useSave(saveDetailsAction);
  return (
    <form action={f.run} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <fieldset disabled={!editable} className="contents">
        <Field label="Company name" error={f.errors.company}>
          <input name="company" defaultValue={details.company} className={adminInput} />
        </Field>
        <Field label="VAT number" error={f.errors.vatNumber}>
          <input name="vatNumber" defaultValue={details.vatNumber} className={adminInput} />
        </Field>
        <Field label="Billing address" error={f.errors.address}>
          <input name="address" defaultValue={details.address} className={adminInput} />
        </Field>
        <Field label="Email bills go to" error={f.errors.email}>
          <input name="email" type="email" defaultValue={details.email} className={adminInput} />
        </Field>
      </fieldset>
      <div className="sm:col-span-2">{editable ? <Save pending={f.pending} saved={f.state?.saved} /> : <p className="text-meta text-text-2">Only the owner can change these.</p>}</div>
    </form>
  );
}
