"use client";

import { useKeptForm } from "@/components/admin/useKeptForm";
import { useState } from "react";
import { Select } from "@/components/Select";
import { Choice, Field, adminButton, adminInput } from "@/components/admin/kit";
import { BuyerFields } from "@/components/admin/BuyerFields";
import { cancelOrderAction, placeOrderAction } from "@/app/dashboard/orders/actions";
import { DEPOSIT_METHODS } from "@/lib/admin/deposits";
import { regPeriodLabel } from "@/lib/leads/reg-periods";
import type { FormState } from "@/lib/admin/validation";

// Placing a factory order, and cancelling one. The server checks every box again.
const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
const full = "sm:col-span-2 lg:col-span-3";

export function PlaceOrderForm({ periods, month, lastMonth, team, me, customers, leadId }: { periods: string[]; month: string; lastMonth: string; team: string[]; me?: string; customers: { id: string; label: string }[]; leadId?: string }) {
  const [state, action, pending] = useKeptForm<FormState>(placeOrderAction, undefined);
  const e = state?.errors ?? {};
  return (
    <form {...action} className={grid} noValidate>
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      <Field label="Make" error={e.make}>
        <input name="make" maxLength={40} className={adminInput} autoComplete="off" />
      </Field>
      <Field label="Model" error={e.model}>
        <input name="model" maxLength={60} className={adminInput} autoComplete="off" />
      </Field>
      <Field label="Colour (optional)" error={e.colour}>
        <input name="colour" maxLength={40} className={adminInput} autoComplete="off" />
      </Field>
      <Field label="Trim, engine and options (optional)" error={e.spec} className={full}>
        <input name="spec" maxLength={120} className={adminInput} autoComplete="off" />
      </Field>
      <Field label="Price (€)" error={e.priceEur}>
        <input name="priceEur" inputMode="numeric" className={adminInput} />
      </Field>
      <Field label="Deposit (€, optional)" error={e.depositEur}>
        <input name="depositEur" inputMode="numeric" className={adminInput} />
      </Field>
      <Field label="Deposit paid by" error={e.depositMethod}>
        <Select name="depositMethod" defaultValue="" options={[["", "No deposit"], ...DEPOSIT_METHODS.map((m) => [m, m] as const)]} />
      </Field>
      <Field label="Registration" error={e.regPeriod}>
        <Select name="regPeriod" defaultValue={periods[1]} options={periods.map((p) => [p, regPeriodLabel(p)] as const)} />
      </Field>
      <Field label="Due" hint="The month the maker gave" error={e.expected}>
        <input name="expected" type="month" min={month} max={lastMonth} className={adminInput} />
      </Field>
      <Field label="Taken by" error={e.salesperson}>
        <Select name="salesperson" defaultValue={me ?? ""} options={[["", "Not set"], ...team.map((t) => [t, t] as const)]} />
      </Field>
      <BuyerFields customers={customers} errors={e} />
      <div className={full}>
        <button type="submit" disabled={pending} className={adminButton}>{pending ? "Saving" : "Place order"}</button>
      </div>
    </form>
  );
}

export function CancelOrderForm({ id, depositEur }: { id: string; depositEur?: number }) {
  const [state, action, pending] = useKeptForm<FormState>(cancelOrderAction.bind(null, id), undefined);
  const [outcome, setOutcome] = useState(depositEur ? "refunded" : "none");
  const e = state?.errors ?? {};
  return (
    <form {...action} className="flex flex-col gap-4" noValidate>
      {depositEur ? (
        <Choice name="outcome" legend="The deposit was" value={outcome} onChange={setOutcome} error={e.outcome} options={[["refunded", "Refunded"], ["kept", "Kept, under our terms"]]} />
      ) : (
        <input type="hidden" name="outcome" value="none" />
      )}
      {outcome === "refunded" && (
        <Field label="Refunded (€)" error={e.refundEur} className="sm:max-w-xs">
          <input name="refundEur" inputMode="numeric" defaultValue={depositEur} className={adminInput} />
        </Field>
      )}
      <button type="submit" disabled={pending} className={`${adminButton} self-start`}>{pending ? "Saving" : "Cancel the order"}</button>
    </form>
  );
}
