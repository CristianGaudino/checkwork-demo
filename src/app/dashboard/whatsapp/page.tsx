import Link from "next/link";
import { Avatar, Badge, Field, Notice, PageHeader, Panel, adminButton, adminInput, rowButton } from "@/components/admin/kit";
import { SHOW_PRICING } from "@/lib/billing/rules";
import { Phones } from "@/components/admin/whatsapp/Phones";
import { CalculatorIcon, CalendarIcon, CarIcon, ChevronDownIcon, InboxIcon, MegaphoneIcon, ReceiptIcon, ReportIcon, StarIcon, SwapIcon, WrenchIcon } from "@/components/stock/icons";
import { getSettings } from "@/lib/admin/collections";
import { MODULES } from "@/lib/modules-rules";
import { enabledModules, requireModule } from "@/lib/modules";
import { can, currentMember } from "@/lib/permissions";
import { BUTTON_LABELS, EVENTS, EVENT_IDS, eventsFor, type EventId } from "@/lib/whatsapp/rules";
import { staffStore, viewFor } from "@/lib/whatsapp/store";
import { saveStaffAction } from "./actions";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const metadata = { title: "WhatsApp" };

const NOTICES: Record<string, { tone: "good" | "warn"; text: string }> = {
  saved: { tone: "good", text: "Saved." },
  invalid: { tone: "warn", text: "Check the phone number and the quiet hours. Nothing was saved." },
};

// One line icon per alert, so the list reads at a glance.
const ICONS: Record<EventId, typeof InboxIcon> = { enquiry: InboxIcon, "slow-stock": CarIcon, "trade-in": SwapIcon, "test-drive": CalendarIcon, service: WrenchIcon, finance: CalculatorIcon, deposit: ReceiptIcon, review: StarIcon, "new-in": MegaphoneIcon, monday: ReportIcon };

const STEPS = [
  ["A buyer gets in touch", "They send a request on your site: a trade-in, a test drive, a question about a car."],
  ["It lands on your phone", "As a WhatsApp message with the car, the photos and buttons to answer."],
  ["Tap a reply", "The buyer gets your answer, and the lead and the activity log are updated for you."],
] as const;

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
  // Every alert, the ones the plan has first, each with the module it comes with.
  const events = EVENT_IDS.map((e) => ({ id: e, module: MODULES.find((m) => m.id === EVENTS[e].module)! }));
  const note = notice ? NOTICES[notice] : undefined;

  return (
    <>
      <PageHeader title="WhatsApp" text="New leads reach your phone. Tap a reply and the site does the rest." />
      {note && <Notice tone={note.tone}>{note.text}</Notice>}

      {/* The live conversation first: both phones side by side, how it works beside them from 1280px and under them before that. */}
      <section aria-labelledby="wa-how" className="grid grid-cols-1 items-start gap-6 rounded-tile border border-hairline bg-row-alt p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex min-w-0 flex-col gap-3">
          {modules.has("tradeIn") && (
            <p className="text-meta text-text-2">
              <span className="font-semibold text-text">Try it:</span> tap Reply with a price on the trade-in and type 8,500.
            </p>
          )}
          <Phones initial={view} />
        </div>
        <div className="flex flex-col gap-4 xl:pt-8">
          <h2 id="wa-how" className="text-section font-semibold">
            How it works
          </h2>
          <ol className="flex flex-col gap-4">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="flex gap-3">
                <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-meta font-semibold text-on-accent">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-body font-medium">{title}</p>
                  <p className="text-meta text-text-2">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Panel title="Staff phones">
        <ul className="flex flex-col divide-y divide-hairline">
          {team.map((t) => {
            const p = phones.find((x) => x.id === t.id);
            const mine = new Set<EventId>(p?.alerts ?? []);
            const count = allowed.filter((e) => mine.has(e)).length;
            const canEdit = mayEditAll || t.name === me.name;
            return (
              <li key={t.id} data-wa-person={t.name}>
                <details className="group">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 py-2 [&::-webkit-details-marker]:hidden">
                    <Avatar name={t.name} className="size-10" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body font-medium">
                        {t.name} <span className="font-normal text-text-2">{t.role}</span>
                      </span>
                      <span className="text-meta text-text-2">{p?.phone ? `${p.phone} · ${count} of ${allowed.length} alerts` : "No number yet"}</span>
                    </span>
                    {p?.phone ? <Badge tone="good">Linked</Badge> : <Badge>Not linked</Badge>}
                    <span className={`${rowButton} max-sm:hidden`}>{canEdit ? "Change" : "See"}</span>
                    {/* A phone has no room for the button; the chevron says the row opens. */}
                    <ChevronDownIcon aria-hidden="true" className="size-5 shrink-0 text-text-2 transition-transform group-open:rotate-180 sm:hidden" />
                  </summary>
                  {canEdit ? (
                    <form action={saveStaffAction.bind(null, t.id)} className="flex flex-col gap-5 pb-5 pt-2 sm:pl-13">
                      <Field label="WhatsApp number" hint="With the country code. Leave empty to unlink." className="max-w-sm">
                        <input name="phone" type="tel" inputMode="tel" defaultValue={p?.phone ?? ""} maxLength={18} className={adminInput} />
                      </Field>
                      <fieldset className="flex flex-col gap-2">
                        <legend className="mb-1 text-meta font-semibold">Alerts to get</legend>
                        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                          {allowed.map((e) => (
                            <label key={e} className="flex min-h-11 items-center gap-2.5 text-body">
                              <input type="checkbox" name="alert" value={e} defaultChecked={mine.has(e)} className="size-5 accent-accent" />
                              {EVENTS[e].label}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <fieldset className="flex flex-col gap-2">
                        <legend className="mb-1 text-meta font-semibold">Quiet hours</legend>
                        <div className="grid max-w-sm grid-cols-2 gap-3">
                          <Field label="From">
                            <input name="quietFrom" type="time" defaultValue={p?.quietFrom ?? ""} className={adminInput} />
                          </Field>
                          <Field label="Until">
                            <input name="quietTo" type="time" defaultValue={p?.quietTo ?? ""} className={adminInput} />
                          </Field>
                        </div>
                      </fieldset>
                      <SubmitButton className={`${adminButton} self-start`}>Save</SubmitButton>
                    </form>
                  ) : (
                    <p className="pb-4 text-meta text-text-2 sm:pl-13">Only {t.name} or an owner or manager can change this.</p>
                  )}
                </details>
              </li>
            );
          })}
        </ul>
      </Panel>

      <section aria-labelledby="wa-alerts" className="flex flex-col gap-4">
        <h2 id="wa-alerts" className="text-section font-semibold">
          What reaches your phone
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {events.map(({ id, module }) => {
            const Icon = ICONS[id];
            return (
              <li key={id} data-wa-module={module.id} className="flex flex-col gap-3 rounded-card border border-hairline bg-card p-4">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-control bg-accent text-on-accent">
                    <Icon className="size-5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <h3 className="text-body font-semibold">{EVENTS[id].label}</h3>
                    <p className="text-meta text-text-2">{EVENTS[id].does}</p>
                  </div>
                </div>
                {/* The buttons the message comes with, drawn as WhatsApp draws them. A picture, not controls. */}
                <ul aria-label="Its buttons" className="mt-auto flex flex-wrap gap-1.5">
                  {EVENTS[id].buttons.map((b) => (
                    <li key={b} className="rounded-full bg-wa-chat px-3 py-1 text-meta font-medium text-wa-link">
                      {BUTTON_LABELS[b]}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
        <p className="max-w-measure text-meta text-text-2">
          Buyers who tick the WhatsApp box on a form get your replies on WhatsApp, and can stop at any time. Everyone else gets email.{" "}
          {SHOW_PRICING ? "If WhatsApp reaches its monthly limit, replies go by email instead. Alerts your plan includes still go by WhatsApp." : "If WhatsApp can't send, alerts and replies go by email instead."}{" "}
          {mayBill && SHOW_PRICING && (
            <Link href="/dashboard/billing" className="font-medium text-accent-text underline underline-offset-2">
              Set the limit
            </Link>
          )}
        </p>
      </section>
    </>
  );
}
