"use client";

import { useActionState } from "react";
import { Select } from "@/components/Select";
import { Field, Panel, adminButton, adminInput, rowButton } from "@/components/admin/kit";
import { addPrepAction, removePrepAction, type PrepFormState } from "@/app/dashboard/stock/actions";
import { PREP_KINDS, type PrepLine } from "@/lib/admin/prep";

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

// Prep costs on a car: a short list and its total, with adding a line folded away until it is wanted, so a dealer who does not track
// prep sees one quiet line. Margins permission only (the page and the server both check).
export function PrepPanel({ carId, lines }: { carId: string; lines: PrepLine[] }) {
  const [state, action, pending] = useActionState<PrepFormState, FormData>(addPrepAction.bind(null, carId), undefined);
  const e = state?.errors ?? {};
  const total = lines.reduce((s, l) => s + l.eur, 0);
  return (
    <Panel title="Prep costs" action={total > 0 && <span className="font-semibold tabular-nums">{eur.format(total)}</span>}>
      {lines.length === 0 ? (
        <p className="text-body text-text-2">None yet. Valet, tyres, NCT and the like go here, on top of the cost price.</p>
      ) : (
        <ul className="-mx-5 flex flex-col">
          {lines.map((l) => (
            <li key={l.at} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2 even:bg-row-alt">
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">{l.kind}</span>
                {l.note && <span title={l.note} className="truncate text-meta text-text-2">{l.note}</span>}
              </span>
              <span className="flex items-center gap-3">
                <span className="tabular-nums">{eur.format(l.eur)}</span>
                <form action={removePrepAction.bind(null, carId, l.at)}>
                  <button type="submit" className={`${rowButton} text-bad`} aria-label={`Remove ${l.kind}, ${eur.format(l.eur)}`}>
                    Remove
                  </button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}
      <details className="group" open={Object.keys(e).length > 0}>
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-meta font-medium text-accent-text underline">Add a prep cost</summary>
        {/* Keyed on the last line added, so the boxes clear for the next one. */}
        <form key={state?.added ?? 0} action={action} className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-[10rem_8rem_minmax(0,1fr)_auto] sm:items-start" noValidate>
          <Field label="For" error={e.kind}>
            <Select name="kind" defaultValue="" options={[["", "Choose"], ...PREP_KINDS.map((k) => [k, k] as const)]} />
          </Field>
          <Field label="Amount (€)" error={e.eur}>
            <input name="eur" inputMode="numeric" className={adminInput} />
          </Field>
          <Field label="Note (optional)" error={e.note}>
            <input name="note" maxLength={80} className={adminInput} />
          </Field>
          <div className="sm:pt-6">
            <button type="submit" disabled={pending} className={adminButton}>
              {pending ? "Adding" : "Add"}
            </button>
          </div>
        </form>
      </details>
    </Panel>
  );
}
