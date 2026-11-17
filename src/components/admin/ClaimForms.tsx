"use client";

import { useKeptForm } from "@/components/admin/useKeptForm";
import { Select } from "@/components/Select";
import { Field, adminButton, adminInput } from "@/components/admin/kit";
import { openClaimAction, setClaimCostAction, type CostState } from "@/app/dashboard/aftersales/actions";
import type { FormState } from "@/lib/admin/validation";

// Opening a warranty claim on a car the dealer sold, and (margins only) what the repair cost. The server checks every box again.
export function OpenClaimForm({ sales, today, defaults }: { sales: { id: string; label: string }[]; today: string; defaults: { saleId?: string; fault?: string; leadId?: string } }) {
  const [state, action, pending] = useKeptForm<FormState>(openClaimAction, undefined);
  const e = state?.errors ?? {};
  return (
    <form {...action} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      {defaults.leadId && <input type="hidden" name="leadId" value={defaults.leadId} />}
      <Field label="Car they bought" error={e.saleId} className="sm:col-span-2">
        <Select name="saleId" defaultValue={defaults.saleId ?? ""} options={[["", "Choose the car"], ...sales.map((s) => [s.id, s.label] as const)]} />
      </Field>
      <Field label="The fault" hint="What it is and when it started" error={e.fault} className="sm:col-span-2">
        <textarea name="fault" maxLength={1000} defaultValue={defaults.fault} className={`${adminInput} h-auto min-h-28 py-2`} />
      </Field>
      <Field label="Day they told us" error={e.openedOn}>
        <input name="openedOn" type="date" max={today} defaultValue={today} className={adminInput} />
      </Field>
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className={adminButton}>{pending ? "Saving" : "Open the claim"}</button>
      </div>
    </form>
  );
}

export function ClaimCostForm({ id, costEur }: { id: string; costEur?: number }) {
  const [state, action, pending] = useKeptForm<CostState>(setClaimCostAction.bind(null, id), undefined);
  return (
    <form {...action} className="flex flex-wrap items-end gap-3">
      <Field label="Repair cost to us (€)" hint="Counts against the car's margin. Leave empty to clear it." error={state?.error} className="sm:max-w-xs">
        <input name="costEur" inputMode="numeric" defaultValue={costEur ?? ""} className={adminInput} />
      </Field>
      <button type="submit" disabled={pending} className={adminButton}>{pending ? "Saving" : "Save cost"}</button>
      {state?.saved && <p role="status" className="text-meta text-ok">Saved.</p>}
    </form>
  );
}
