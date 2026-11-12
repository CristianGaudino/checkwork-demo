"use client";

import { Select } from "@/components/Select";
import { startTransition, useActionState, useState } from "react";
import { Field, adminButton, adminButtonQuiet, adminInput } from "@/components/admin/kit";
import { addTeamAction, setRoleAction, saveLeadEmailsAction, saveMarketingAction, sendTestEmailAction, saveNotificationsAction, saveTargetsAction, type SettingsState } from "@/app/dashboard/settings/actions";
import type { DealerSettings, TeamMember } from "@/lib/admin/collections";
import { ROLES } from "@/lib/permission-rules";

const ROLE_OPTIONS = ROLES.map((r) => [r, r] as const);

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
        <p role="status" className="text-meta text-ok">
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

export function LeadEmailsForm({ settings, fallback }: { settings: DealerSettings; fallback: boolean }) {
  const f = useSave(saveLeadEmailsAction);
  const t = useSave(sendTestEmailAction as Action);
  return (
    <div className="flex flex-col gap-4">
      <form action={f.run} className="flex flex-col gap-3" noValidate>
        <Field label="Send new leads to" hint="One address per line. Leave empty to use the site's own address." error={f.errors.leadEmails}>
          <textarea name="leadEmails" rows={3} defaultValue={settings.leadEmails.join(String.fromCharCode(10))} className={`${adminInput} h-auto py-2`} />
        </Field>
        {settings.leadEmails.length === 0 && <p className="text-meta text-text-2">{fallback ? "Using the site's own address." : "No address is set, so new leads cannot be sent yet."}</p>}
        <Save pending={f.pending} saved={f.state?.saved} />
      </form>
      <form action={t.run} className="flex items-center gap-4">
        <button type="submit" disabled={t.pending} className={adminButtonQuiet}>
          {t.pending ? "Sending" : "Send a test email"}
        </button>
        {t.state?.saved && !t.pending && <p role="status" className="text-meta text-ok">Sent</p>}
        {t.errors.test && !t.pending && <p role="alert" className="text-meta text-destructive">{t.errors.test}</p>}
      </form>
    </div>
  );
}

// Only what is sent: the morning follow-up email. A new lead's email is set under Lead emails; the dashboard's own bell needs no setting.
const NOTES: [keyof DealerSettings["notifications"], string][] = [["followUps", "Each morning, each salesperson's follow-ups that are due"]];

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
      {f.errors.notifications && !f.pending && <p role="alert" className="text-meta text-destructive">{f.errors.notifications}</p>}
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

// `owner`: the signed-in person is an owner, so Owner is a role they may give.
export function AddTeamForm({ owner }: { owner: boolean }) {
  const f = useSave(addTeamAction);
  return (
    <form action={f.run} className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-start" noValidate>
      <Field label="Name" error={f.errors.name}>
        <input name="name" className={adminInput} autoComplete="off" />
      </Field>
      <Field label="Email" error={f.errors.email}>
        <input name="email" type="email" className={adminInput} autoComplete="off" />
      </Field>
      <Field label="Role" error={f.errors.role}>
        <Select name="role" defaultValue="Sales" options={owner ? ROLE_OPTIONS : ROLE_OPTIONS.filter(([r]) => r !== "Owner")} />
      </Field>
      <div className="sm:pt-6">
        <Save pending={f.pending} saved={f.state?.saved} />
      </div>
    </form>
  );
}

// One person's role, saved as soon as it is picked, by an owner or manager (the server checks again). A refused change shows why and puts
// the picker back to the role they still have.
export function RoleForm({ member, owner }: { member: TeamMember; owner: boolean }) {
  const f = useSave(setRoleAction.bind(null, member.id));
  const [picked, setPicked] = useState<string>(member.role);
  const shown = f.state?.errors && !f.pending ? member.role : picked;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="w-36">
        <Select
          label={`Role for ${member.name}`}
          value={shown}
          onChange={(role) => {
            setPicked(role);
            const data = new FormData();
            data.set("role", role);
            startTransition(() => f.run(data));
          }}
          options={owner ? ROLE_OPTIONS : ROLE_OPTIONS.filter(([r]) => r !== "Owner")}
        />
      </div>
      {f.errors.role && !f.pending && (
        <p role="alert" className="max-w-48 text-right text-meta text-destructive">
          {f.errors.role}
        </p>
      )}
      {f.state?.saved && !f.pending && (
        <p role="status" className="text-meta text-ok">
          Saved
        </p>
      )}
    </div>
  );
}
