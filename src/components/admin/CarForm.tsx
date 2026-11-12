"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { RegLookup } from "@/components/leads/RegLookup";
import { Select } from "@/components/Select";
import { Field, Panel, adminButton, adminButtonQuiet, adminInput } from "@/components/admin/kit";
import { saveCarAction, type CarFormState } from "@/app/dashboard/stock/actions";
import { CAR_FIELDS, FIELD_GROUPS } from "@/lib/admin/car-fields";
import type { Car } from "@/lib/stock/types";

// Add or edit a car. Every box comes from CAR_FIELDS; the server checks it again (car-form.ts), and a bad box comes back with its message.
// `car` is the car being edited, or none for a new one.
// `cost` is only given to staff with the margins permission, and the box is not in the page without it.
// `reg`: a registration to start a new car from (a trade-in taken on a sale).
export function CarForm({ car, cost, reg: startReg = "" }: { car?: Car; cost?: { eur?: number }; reg?: string }) {
  const [state, action, pending] = useActionState<CarFormState, FormData>(saveCarAction.bind(null, car?.id ?? null), undefined);
  const errors = state?.errors ?? {};
  // What the registration lookup filled in. The boxes are uncontrolled, so a lookup redraws them (`drawn`) from what was typed plus what
  // was found; a box already typed in keeps its value.
  const [found, setFound] = useState<Record<string, string>>({});
  const [drawn, setDrawn] = useState(0);
  const [reg, setReg] = useState(startReg);
  const form = useRef<HTMLFormElement>(null);
  const value = (name: string): string => {
    if (found[name] !== undefined) return found[name];
    const v = name === "features" ? car?.features?.join("\n") : (car as Record<string, unknown> | undefined)?.[name];
    return v === undefined || v === null ? "" : String(v);
  };
  const fill = (from: Record<string, string | number | undefined>) => {
    const typed = Object.fromEntries([...new FormData(form.current!)].map(([k, v]) => [k, String(v)]));
    const next: Record<string, string> = { ...typed };
    for (const [k, v] of Object.entries(from)) if (v !== undefined && !typed[k]) next[k] = String(v);
    setFound(next);
    setDrawn((n) => n + 1);
  };

  return (
    <form ref={form} action={action} className="flex flex-col gap-6" noValidate>
      {/* Adding a car starts from its registration: the lookup fills the basics and details, and every box can still be changed. */}
      {!car && (
        <Panel title="Registration">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
            <Field label="Registration" className="flex-1 sm:max-w-xs">
              <input value={reg} onChange={(e) => setReg(e.target.value.toUpperCase())} autoCapitalize="characters" spellCheck={false} maxLength={12} placeholder="191-KY-1234" className={adminInput} />
            </Field>
            <RegLookup
              reg={reg}
              className="h-11 sm:mt-6 sm:w-44"
              onFound={({ year, car: c }) => fill({ year, make: c?.make, model: c?.model, fuel: c?.fuel, engineLitres: c?.engineLitres, colour: c?.colour, bodyType: c?.bodyType })}
            />
          </div>
        </Panel>
      )}
      <div key={drawn} className="flex flex-col gap-6">
      {FIELD_GROUPS.map((group) => (
        <Panel key={group} title={group}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAR_FIELDS.filter((f) => f.group === group).map((f) => (
              <Field key={f.name} label={f.label} hint={f.hint} error={errors[f.name]} className={f.wide ? "sm:col-span-2 lg:col-span-3" : ""}>
                {f.type === "select" ? (
                  <Select name={f.name} defaultValue={value(f.name)} options={[["", f.name === "condition" ? "Used" : "Not set"], ...f.options!.filter(([v]) => !(f.name === "condition" && v === "used"))]} />
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

      </div>
      {cost && (
        <Panel title="Cost">
          <Field label="Cost price (€)" hint="What the car cost you. Only people with the margins permission see this." error={errors.costEur} className="sm:max-w-xs">
            <input name="costEur" type="number" min={0} step={50} inputMode="decimal" defaultValue={cost.eur ?? ""} className={adminInput} />
          </Field>
        </Panel>
      )}

      {/* A new car is added or kept as a draft by its buttons. Selling is Mark sold on the stock list, which records the sale with it. */}
      {car && (
        <Panel title="Status">
          <Field label="On the website" className="sm:max-w-md" hint={car.soldAt ? "Sold. A sold car stays on the website for a while, marked Sold." : "A hidden car or a draft is not on the website, and its link is not found."}>
            <Select name="listing" defaultValue={car.listing ?? "live"} options={[["live", "Shown"], ["hidden", "Hidden"], ["draft", "Draft"]]} />
          </Field>
          <p className="text-meta text-text-2">Photos on this car: {car.photos.length}</p>
        </Panel>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" name={car ? undefined : "listing"} value={car ? undefined : "live"} disabled={pending} className={adminButton}>
          {pending ? "Saving" : car ? "Save changes" : "Add car"}
        </button>
        {!car && (
          <button type="submit" name="listing" value="draft" disabled={pending} className={adminButtonQuiet}>
            Save draft
          </button>
        )}
        <Link href="/dashboard/stock" className={adminButtonQuiet}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
