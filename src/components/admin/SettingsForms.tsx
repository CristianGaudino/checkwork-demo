"use client";

import { useActionState } from "react";
import { Field, adminButton, adminInput } from "@/components/admin/kit";
import { addTeamAction, saveMarketingAction, saveNotificationsAction, saveTargetsAction, type SettingsState } from "@/app/admin/settings/actions";
import type { DealerSettings } from "@/lib/admin/collections";

// Each settings panel is its own small form that saves on its own and says so. The server checks every value again.
type Action = (prev: SettingsState, data: FormData) => Promise<SettingsState>;

function useSave(action: Action) {
  const [state, run, pending] = useActionState<SettingsState, FormData>(action, undefined);
  return { state, run, pending, errors: state?.errors ?? {} };
}

function Save({ pending, saved }: { pending: boolean; saved?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <button type="submit" disabled={pending} className={adminButton}>
        {pending ? "Saving" : "Save"}
      </button>
      {saved && !pending && (
        <p role="status" className="text-meta text-better">
          Saved
        </p>
      )}
    </div>
  );
}

export function TargetsForm({ settings }: { settings: DealerSettings }) {
  const f = useSave(saveTargetsAction);
  return (
    <form action={f.run} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <Field label="Reply to a new lead within (hours)" hint="Leads waiting longer show on the overview" error={f.errors.leadSlaHours}>
        <input name="leadSlaHours" type="number" defaultValue={settings.leadSlaHours} className={adminInput} />
      </Field>
      <Field label="Test drive slot (minutes)" hint="The same car cannot be booked twice within this time" error={f.errors.driveSlotMinutes}>
        <input name="driveSlotMinutes" type="number" defaultValue={settings.driveSlotMinutes} className={adminInput} />
      </Field>
      <div className="sm:col-span-2">
        <Save pending={f.pending} saved={f.state?.saved} />
      </div>
    </form>
  );
}

const NOTES: [keyof DealerSettings["notifications"], string][] = [["newLead", "A new lead arrives"], ["testDrive", "A test drive is requested"], ["review", "A new review is posted"], ["weeklyReport", "A weekly summary, every Monday"]];

export function NotificationsForm({ settings, emailConnected }: { settings: DealerSettings; emailConnected: boolean }) {
  const f = useSave(saveNotificationsAction);
  return (
    <form action={f.run} className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-meta font-semibold">Email me when</legend>
        {NOTES.map(([k, label]) => (
          <label key={k} className="flex min-h-11 items-center gap-3">
            <input type="checkbox" name={k} defaultChecked={settings.notifications[k]} className="size-5 accent-accent" />
            {label}
          </label>
        ))}
      </fieldset>
      {!emailConnected && <p className="text-meta text-text-2">Email sending is not connected yet. See Connected services below.</p>}
      <Save pending={f.pending} saved={f.state?.saved} />
    </form>
  );
}

export function MarketingForm({ settings }: { settings: DealerSettings }) {
  const f = useSave(saveMarketingAction);
  return (
    <form action={f.run} className="grid grid-cols-1 gap-4" noValidate>
      <Field label="How we sound" hint="Used when posts and newsletters are written" error={f.errors.voice}>
        <input name="voice" defaultValue={settings.marketing.voice} className={adminInput} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Hashtags" error={f.errors.hashtags}>
          <input name="hashtags" defaultValue={settings.marketing.hashtags} className={adminInput} />
        </Field>
        <Field label="Sign-off line" error={f.errors.signOff}>
          <input name="signOff" defaultValue={settings.marketing.signOff} className={adminInput} />
        </Field>
      </div>
      <Save pending={f.pending} saved={f.state?.saved} />
    </form>
  );
}

export function AddTeamForm() {
  const f = useSave(addTeamAction);
  return (
    <form action={f.run} className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-start" noValidate>
      <Field label="Name" error={f.errors.name}>
        <input name="name" className={adminInput} autoComplete="off" />
      </Field>
      <Field label="Email" error={f.errors.email}>
        <input name="email" type="email" className={adminInput} autoComplete="off" />
      </Field>
      <Field label="Role">
        <select name="role" defaultValue="Sales" className={adminInput}>
          <option>Owner</option>
          <option>Sales</option>
          <option>Finance</option>
        </select>
      </Field>
      <div className="sm:pt-6">
        <Save pending={f.pending} saved={f.state?.saved} />
      </div>
    </form>
  );
}
