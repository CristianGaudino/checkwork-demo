"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Panel, adminButton, adminButtonQuiet, adminInput } from "@/components/admin/kit";
import { saveCarAction, type CarFormState } from "@/app/admin/stock/actions";
import { CAR_FIELDS, FIELD_GROUPS } from "@/lib/admin/car-fields";
import type { Car } from "@/lib/stock/types";

// Add or edit a car. Every box comes from CAR_FIELDS; the server checks it again (car-form.ts), and a bad box comes back with its message.
// `car` is the car being edited, or none for a new one.
export function CarForm({ car }: { car?: Car }) {
  const [state, action, pending] = useActionState<CarFormState, FormData>(saveCarAction.bind(null, car?.id ?? null), undefined);
  const errors = state?.errors ?? {};
  const value = (name: string): string => {
    const v = name === "features" ? car?.features?.join("\n") : (car as Record<string, unknown> | undefined)?.[name];
    return v === undefined || v === null ? "" : String(v);
  };

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      {FIELD_GROUPS.map((group) => (
        <Panel key={group} title={group}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAR_FIELDS.filter((f) => f.group === group).map((f) => (
              <Field key={f.name} label={f.label} hint={f.hint} error={errors[f.name]} className={f.wide ? "sm:col-span-2 lg:col-span-3" : ""}>
                {f.type === "select" ? (
                  <select name={f.name} defaultValue={value(f.name)} className={adminInput}>
                    <option value="">{f.name === "condition" ? "Used" : "Not set"}</option>
                    {f.options!.filter(([v]) => !(f.name === "condition" && v === "used")).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea name={f.name} defaultValue={value(f.name)} rows={f.name === "features" ? 6 : 5} className={`${adminInput} h-auto py-2`} />
                ) : (
                  <input name={f.name} type={f.type} step={f.step} inputMode={f.type === "number" ? "decimal" : undefined} defaultValue={value(f.name)} aria-invalid={errors[f.name] ? true : undefined} className={adminInput} />
                )}
              </Field>
            ))}
          </div>
        </Panel>
      ))}

      <Panel title="Status">
        <Field label="Availability" hint="A sold car stays on the site for a while, marked Sold.">
          <select name="status" defaultValue={car?.soldAt ? "sold" : "for-sale"} className={`${adminInput} sm:max-w-xs`}>
            <option value="for-sale">For sale</option>
            <option value="sold">Sold</option>
          </select>
        </Field>
        <p className="text-meta text-text-2">Photos on this car: {car?.photos.length ?? 0}</p>
      </Panel>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={adminButton}>
          {pending ? "Saving" : car ? "Save changes" : "Add car"}
        </button>
        <Link href="/admin/stock" className={adminButtonQuiet}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
