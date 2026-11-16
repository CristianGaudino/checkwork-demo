import Link from "next/link";
import { Field, Notice, PageHeader, Panel, adminButton, adminInput, rowButton } from "@/components/admin/kit";
import { ActButton } from "@/components/admin/ActButton";
import { askModuleAction } from "@/app/dashboard/billing/actions";
import { Phones } from "@/components/admin/whatsapp/Phones";
import { WhatsAppIcon } from "@/components/stock/icons";
import { getSettings } from "@/lib/admin/collections";
import { MODULES, type ModuleId } from "@/lib/modules-rules";
import { enabledModules, requireModule } from "@/lib/modules";
import { can, currentMember } from "@/lib/permissions";
import { EVENTS, EVENT_IDS, eventsFor, type EventId } from "@/lib/whatsapp/rules";
import { staffStore, viewFor } from "@/lib/whatsapp/store";
import { saveStaffAction } from "./actions";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const metadata = { title: "WhatsApp" };

const NOTICES: Record<string, { tone: "good" | "warn"; text: string }> = {
  saved: { tone: "good", text: "Saved." },
  invalid: { tone: "warn", text: "Check the phone number and the quiet hours. Nothing was saved." },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  await requireModule("whatsapp");
  const { notice } = await searchParams;
  const modules = await enabledModules();
  const me = await currentMember();
  const { team } = await getSettings();
  const phones = await staffStore.list();
  const view = await viewFor(me.name, modules);
  const mayEditAll = await can("settings");
  const mayBill = await can("billing");
  const allowed = eventsFor(modules);
  // The events by the module they belong to, in the order the modules are sold.
  const groups = MODULES.map((m) => ({ id: m.id as ModuleId, label: m.label, events: EVENT_IDS.filter((e) => EVENTS[e].module === m.id) })).filter((g) => g.events.length > 0);
  const note = notice ? NOTICES[notice] : undefined;

  return (
    <>
      <PageHeader title="WhatsApp" text="Your leads on your phone. Tap a reply and the site does the rest." />
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="min-w-0 lg:sticky lg:top-24">
          <Phones initial={view} />
        </div>
        <div className="flex flex-col gap-6">
          <Panel title="What WhatsApp does for you">
            <p className="max-w-measure text-body text-text-2">
              <WhatsAppIcon className="mr-1.5 inline size-5 align-text-bottom text-whatsapp" />
              Each new request reaches your phone as a WhatsApp message with the buttons to deal with it. What you tap or type is checked by the site, written on the lead and in
              the activity log, and sent on to the buyer. Try it on the phone: tap Reply with a price on the trade-in and type 8,500.
            </p>
            <ul className="flex flex-col gap-4">
              {groups.map((g) => {
                const on = modules.has(g.id);
                return (
                  <li key={g.id} data-wa-module={g.id} className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-body font-semibold">{g.label}</h3>
                      {/* As on Billing: a request to us, for the owners and managers. Switches nothing on. */}
                      {!on && mayBill && (
                        <ActButton act={askModuleAction.bind(null, g.id)} done="We have your request. Our reply will show in Help." label={`Ask us to add ${g.label}`} className={rowButton}>
                          Ask us to add
                        </ActButton>
                      )}
                    </div>
                    <ul className={`flex flex-col gap-1.5 ${on ? "" : "opacity-60"}`}>
                      {g.events.map((e) => (
                        <li key={e} className="max-w-measure text-meta">
                          <span className="font-medium">{EVENTS[e].label}. </span>
                          <span className="text-text-2">{EVENTS[e].does}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
            <p className="max-w-measure text-meta text-text-2">
              Buyers who tick the WhatsApp box on a form get a confirmation and your replies on WhatsApp, and can stop at any time. Everyone else gets email. If WhatsApp is over its
              monthly cap, alerts and replies go by email instead.{" "}
              {mayBill && (
                <Link href="/dashboard/billing" className="font-medium text-accent-text underline underline-offset-2">
                  Set the cap
                </Link>
              )}
            </p>
          </Panel>

          <Panel title="Staff phones">
            <p className="max-w-measure text-meta text-text-2">Link a number and choose the alerts it gets. Only a linked number can act on an alert.</p>
            <ul className="flex flex-col divide-y divide-hairline">
              {team.map((t) => {
                const p = phones.find((x) => x.id === t.id);
                const mine = new Set<EventId>(p?.alerts ?? []);
                const canEdit = mayEditAll || t.name === me.name;
                return (
                  <li key={t.id} data-wa-person={t.name} className="py-2">
                    <details>
                      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-0.5 [&::-webkit-details-marker]:hidden">
                        <span className="text-body font-medium">
                          {t.name} <span className="font-normal text-text-2">{t.role}</span>
                        </span>
                        <span className="text-meta text-text-2">{p?.phone ? `${p.phone}, ${allowed.filter((e) => mine.has(e)).length} alerts` : "Not linked"}</span>
                      </summary>
                      {canEdit ? (
                        <form action={saveStaffAction.bind(null, t.id)} className="flex flex-col gap-4 pb-2 pt-3">
                          <Field label="WhatsApp number" hint="With the country code. Leave empty to unlink.">
                            <input name="phone" type="tel" inputMode="tel" defaultValue={p?.phone ?? ""} maxLength={18} className={adminInput} />
                          </Field>
                          <fieldset className="flex flex-col gap-2">
                            <legend className="mb-1 text-meta font-semibold">Alerts</legend>
                            {allowed.map((e) => (
                              <label key={e} className="flex min-h-9 items-center gap-2.5 text-body">
                                <input type="checkbox" name="alert" value={e} defaultChecked={mine.has(e)} className="size-5" />
                                {EVENTS[e].label}
                              </label>
                            ))}
                          </fieldset>
                          <div className="grid max-w-sm grid-cols-2 gap-3">
                            <Field label="Quiet from">
                              <input name="quietFrom" type="time" defaultValue={p?.quietFrom ?? ""} className={adminInput} />
                            </Field>
                            <Field label="Quiet until">
                              <input name="quietTo" type="time" defaultValue={p?.quietTo ?? ""} className={adminInput} />
                            </Field>
                          </div>
                          <SubmitButton className={`${adminButton} self-start`}>
                            Save
                          </SubmitButton>
                        </form>
                      ) : (
                        <p className="pb-2 pt-3 text-meta text-text-2">Only {t.name} or an owner or manager can change this.</p>
                      )}
                    </details>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
