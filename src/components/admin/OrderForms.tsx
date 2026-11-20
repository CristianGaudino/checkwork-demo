"use client";

import { useKeptForm } from "@/components/admin/useKeptForm";
import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/admin/ActButton";
import { Select } from "@/components/Select";
import { Choice, Field, adminButton, adminInput, dangerButton } from "@/components/admin/kit";
import { BuyerFields } from "@/components/admin/BuyerFields";
import { cancelOrderAction, placeOrderAction } from "@/app/dashboard/orders/actions";
import { DEPOSIT_METHODS } from "@/lib/admin/deposits";
import { monthChoices } from "@/lib/admin/format";
import { regPeriodLabel } from "@/lib/leads/reg-periods";
import type { FormState } from "@/lib/admin/validation";

// Placing a factory order, and cancelling one. The server checks every box again.
const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
const full = "sm:col-span-2 lg:col-span-3";

// One numbered part of a longer form: its number in a circle and a short name, then its boxes.
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-4 flex items-center gap-3 text-heading font-semibold">
        <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-accent text-meta font-semibold text-on-accent">{n}</span>
        {title}
      </legend>
      <div className={grid}>{children}</div>
    </fieldset>
  );
}

export function PlaceOrderForm({ periods, month, team, me, customers, leadId }: { periods: string[]; month: string; team: string[]; me?: string; customers: { id: string; label: string }[]; leadId?: string }) {
  const [state, action, pending] = useKeptForm<FormState>(placeOrderAction, undefined);
  const e = state?.errors ?? {};
  return (
    // Four short numbered steps on one page, in the order the conversation goes: the car, who it is for, the money, when it comes. Optional
    // boxes say so, so the few that must be filled stand out.
    <form {...action} className="flex flex-col gap-8" noValidate>
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      <Step n={1} title="The car">
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
      </Step>
      <Step n={2} title="Who it is for">
        <BuyerFields customers={customers} errors={e} />
      </Step>
      <Step n={3} title="Price and deposit">
        <Field label="Price (€)" error={e.priceEur}>
          <input name="priceEur" inputMode="numeric" className={adminInput} />
        </Field>
        <Field label="Deposit (€, optional)" error={e.depositEur}>
          <input name="depositEur" inputMode="numeric" className={adminInput} />
        </Field>
        <Field label="Deposit paid by" error={e.depositMethod}>
          <Select name="depositMethod" defaultValue="" options={[["", "No deposit"], ...DEPOSIT_METHODS.map((m) => [m, m] as const)]} />
        </Field>
      </Step>
      <Step n={4} title="When it comes">
        <Field label="Due" hint="The month the maker gave" error={e.expected}>
          {/* This month and the next 24, as the server allows. */}
          <Select name="expected" defaultValue="" options={[["", "Choose a month"], ...monthChoices(month, 25)]} />
        </Field>
        <Field label="Reg period" error={e.regPeriod}>
          <Select name="regPeriod" defaultValue={periods[1]} options={periods.map((p) => [p, regPeriodLabel(p)] as const)} />
        </Field>
        <Field label="Taken by" error={e.salesperson}>
          <Select name="salesperson" defaultValue={me ?? ""} options={[["", "Not set"], ...team.map((t) => [t, t] as const)]} />
        </Field>
      </Step>
      <div className="border-t border-hairline pt-6">
        <button type="submit" disabled={pending} className={adminButton}>{pending ? "Saving" : "Place order"}</button>
      </div>
    </form>
  );
}

export function CancelOrderForm({ id, depositEur }: { id: string; depositEur?: number }) {
  const [state, action, pending] = useKeptForm<FormState>(cancelOrderAction.bind(null, id), undefined);
  const [outcome, setOutcome] = useState(depositEur ? "refunded" : "none");
  const [asking, setAsking] = useState(false);
  const sure = useRef(false);
  const e = state?.errors ?? {};
  return (
    // Cancelling cannot be undone, so it asks first in the dashboard's own dialog, as deleting a car does; yes sends the form as it is.
    <form {...action} onSubmit={(ev) => (sure.current ? ((sure.current = false), action.onSubmit(ev)) : (ev.preventDefault(), setAsking(true)))} className="flex flex-col gap-4" noValidate>
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
      <button type="submit" disabled={pending} className={`${dangerButton} self-start`}>{pending ? "Saving" : "Cancel the order"}</button>
      {asking && <ConfirmDialog confirm={{ title: "Cancel this order?", text: "This cannot be undone.", yes: "Cancel the order" }} onYes={() => ((sure.current = true), action.ref.current?.requestSubmit())} onClose={() => setAsking(false)} />}
    </form>
  );
}
