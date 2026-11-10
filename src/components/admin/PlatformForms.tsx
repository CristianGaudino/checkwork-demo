"use client";

import { useActionState } from "react";
import { Field, adminButton, adminInput } from "@/components/admin/kit";
import { addDealershipAction, savePlatformSettingsAction, type AddState, type SettingsState } from "@/app/platform/actions";
import type { PlatformSettings } from "@/lib/admin/platform";
import { PLANS } from "@/lib/plans";

// The two platform forms. The server checks every value again; these draw the boxes and the messages.
export function AddDealershipForm() {
  const [state, action, pending] = useActionState<AddState, FormData>(addDealershipAction, undefined);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-start" noValidate>
      <Field label="Name" error={e.name}>
        <input name="name" className={adminInput} autoComplete="off" />
      </Field>
      <Field label="Town" error={e.town}>
        <input name="town" className={adminInput} autoComplete="off" />
      </Field>
      <Field label="Owner" error={e.owner}>
        <input name="owner" className={adminInput} autoComplete="off" />
      </Field>
      <div className="sm:pt-6">
        <button type="submit" disabled={pending} className={adminButton}>
          {pending ? "Adding" : "Start a trial"}
        </button>
      </div>
    </form>
  );
}

export function PlatformSettingsForm({ settings }: { settings: PlatformSettings }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(savePlatformSettingsAction, undefined);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-start" noValidate>
      <Field label="Trial length (days)" error={e.trialDays}>
        <input name="trialDays" type="number" defaultValue={settings.trialDays} className={adminInput} />
      </Field>
      <Field label="Plan for new trials">
        <select name="defaultPlan" defaultValue={settings.defaultPlan} className={adminInput}>
          {PLANS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Support email" error={e.supportEmail}>
        <input name="supportEmail" type="email" defaultValue={settings.supportEmail} className={adminInput} />
      </Field>
      <div className="flex items-center gap-4 sm:col-span-3">
        <button type="submit" disabled={pending} className={adminButton}>
          {pending ? "Saving" : "Save"}
        </button>
        {state?.saved && !pending && (
          <p role="status" className="text-meta text-better">
            Saved
          </p>
        )}
      </div>
    </form>
  );
}
