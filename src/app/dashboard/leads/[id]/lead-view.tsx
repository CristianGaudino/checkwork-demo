import { sourceText } from "@/lib/visit-rules";
import { NEW_TAB } from "@/components/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActButton, ChoiceAct } from "@/components/admin/ActButton";
import { stopWhatsAppAction } from "@/app/dashboard/whatsapp/actions";
import { LeadStatusBadge } from "@/components/admin/badges";
import { RegLookup } from "@/components/leads/RegLookup";
import { AITextarea } from "@/components/admin/AIWriter";
import { IfModule } from "@/components/IfModule";
import { lookupRegStaffAction } from "@/app/dashboard/reg-action";
import { Avatar, Badge, Field, PageHeader, Panel, adminButton, adminButtonQuiet, adminInput, rowButton } from "@/components/admin/kit";
import { LEAD_TYPE_LABELS, LOST_REASONS, getSettings, leadStatusLabel, leadStatusSteps, leadsStore } from "@/lib/admin/collections";
import { fmtDateTime } from "@/lib/admin/format";

import { adminCars } from "@/lib/admin/stock-admin";
import { isSold } from "@/lib/stock/types";
import { CalendarIcon, CheckIcon, CloseIcon, PhoneIcon } from "@/components/stock/icons";
import type { LeadStatus } from "@/lib/admin/collections";
import { addNoteAction, assignLeadAction, setFollowUpAction, setLostReasonAction, setStatusAction } from "../actions";
import { dublinDay, fmtDate } from "@/lib/admin/format";
import { followUpDue, isOpenLead } from "@/lib/admin/leads";
import { signPhotoPath } from "@/lib/leads/photos";
import { carHref } from "@/lib/stock/format";
import { stockSource } from "@/lib/stock-source";
import { NotesPanel } from "@/components/admin/NotesPanel";
import { ContactButtons } from "@/components/admin/ContactButtons";
import { leadTags } from "@/lib/leads/contact-topics";
import { SubmitButton } from "@/components/admin/SubmitButton";

// The quick actions on a lead: the steps it moves through (leadStatusSteps), each with its icon.
const STATUS_ICONS: Record<LeadStatus, typeof PhoneIcon> = { new: PhoneIcon, contacted: PhoneIcon, appointment: CalendarIcon, won: CheckIcon, lost: CloseIcon };

// One lead, worked from here: its message, contact, status, follow-up, who has it, notes. Shown at its own address under Leads, or, for a
// warranty request, under Aftersales (where it is listed), so the menu marks the right place. The pages around it choose which.
export async function LeadView({ id }: { id: string }) {
  const [lead, settings] = await Promise.all([leadsStore.get(id), getSettings()]);
  if (!lead) notFound();
  // The car the lead asked about has sold since (here, or on DoneDeal): the salesperson offers something like it.
  const car = lead.carSlug ? (await adminCars()).find((c) => c.slug === lead.carSlug) : undefined;
  const carSold = car !== undefined && isSold(car);
  const today = dublinDay();
  // What puts the follow-up back as it was, for Undo: none, or its day (a day that has passed cannot be set again).
  // And the status as it was, with the follow-up day and the lost reason a move clears.
  const statusBack = { status: lead.status, ...(lead.followUpOn && { on: lead.followUpOn }), ...(lead.lostReason && { reason: lead.lostReason }) };
  const followUpBack: Record<string, string> | undefined = !lead.followUpOn ? { clear: "1" } : lead.followUpOn >= today ? { on: lead.followUpOn } : undefined;
  // Their car's photos, on links that last an hour: the email's links expire after 7 days, the photos are kept 12 months.
  const secret = process.env.PHOTO_LINK_SECRET;
  const photos = secret ? await Promise.all((lead.photoKeys ?? []).map((k) => signPhotoPath(k, secret, 3600))) : [];

  return (
    <>
      <PageHeader
        title={lead.name}
        text={`${LEAD_TYPE_LABELS[lead.type]} · ${sourceText(lead)} · ${fmtDateTime(lead.createdAt)}`}
        // A warranty request is aftersales work: it is listed there, so the way back is there.
        back={lead.type === "warranty" ? { href: "/dashboard/aftersales?view=requests", label: "Aftersales" } : { href: "/dashboard/leads", label: "Leads" }}
      />
      {/* On a phone the two columns become one list, in the order a call goes: who, what they said, then what to do. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6 max-lg:contents">
          <Panel title="Message" className="max-lg:order-2">
            {/* A guided contact form's taps say what they want, often with no words typed: the same tags as the list. */}
            {lead.topic && <p className="text-body font-medium">{leadTags(lead.topic, lead.answers ?? {}).join(" · ")}</p>}
            {lead.message && <p className="max-w-measure whitespace-pre-line text-body">{lead.message}</p>}
            {lead.carTitle && lead.carSlug && (
              <p className="text-meta text-text-2">
                About{" "}
                <Link href={carHref(lead.carSlug)} className="inline-flex min-h-11 items-center font-medium text-text underline">
                  {lead.carTitle}
                </Link>
              </p>
            )}
            {carSold && (
              <p className="rounded-control bg-warn-soft px-4 py-3 text-body text-warn">
                This car has sold. Offer them something similar:{" "}
                <Link href={`/makes/${car.makeSlug}`} className="font-medium underline">
                  other {car.make} cars
                </Link>
                .
              </p>
            )}
          </Panel>
          {/* A reply to copy into email or WhatsApp: written from their message and the car, never from their phone or email. */}
          <IfModule id="ai">
            <Panel title="Draft a reply" className="max-lg:order-2">
              <AITextarea label="Reply draft" task="leadReply" rows={6} copy request={{ task: "leadReply", leadId: lead.id }} />
            </Panel>
          </IfModule>
          {photos.length > 0 && (
            <Panel title="Photos" className="max-lg:order-7">
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map((src, i) => (
                  <li key={src}>
                    <a href={src} {...NEW_TAB} className="block overflow-hidden rounded-control">
                      <img src={src} alt={`Photo ${i + 1} of their car (opens in a new tab)`} className="aspect-square w-full object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {/* Selling or trading in: the car's plate, and a lookup so the dealer sees what it is before calling back. */}
          {lead.reg && (
            <Panel title="Their car" className="max-lg:order-7">
              <p className="text-body">
                Registration <span className="font-medium tabular-nums">{lead.reg}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <RegLookup reg={lead.reg} lookup={lookupRegStaffAction} place="dashboard" className="h-11 text-meta sm:w-44" />
              </div>
            </Panel>
          )}
          <NotesPanel notes={lead.notes} action={addNoteAction.bind(null, lead.id)} className="max-lg:order-8" />
        </div>

        <div className="flex min-w-0 flex-col gap-6 max-lg:contents">
          {/* The first thing a lead needs is a reply: three ways, each one press. */}
          <Panel title="Contact" className="max-lg:order-1">
            <p className="flex flex-col text-meta text-text-2">
              <span className="break-all">{lead.email}</span>
              <span>{lead.phone}</span>
            </p>
            <ContactButtons phone={lead.phone} email={lead.email} />
            {/* They ticked the WhatsApp box on the form: the site's messages reach them there until someone stops it. */}
            {lead.whatsappOptIn && (
              <IfModule id="whatsapp">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-meta text-text-2">WhatsApp updates: on</p>
                  <ActButton act={stopWhatsAppAction.bind(null, lead.id)} done="WhatsApp updates stopped" confirm={{ title: "Stop WhatsApp?", text: "Nothing more goes to them on WhatsApp. They get email instead, if they gave an address.", yes: "Stop WhatsApp" }} className={rowButton}>
                    Stop WhatsApp
                  </ActButton>
                </div>
              </IfModule>
            )}
          </Panel>
          <Panel title="Status" className="max-lg:order-3" action={<LeadStatusBadge status={lead.status} type={lead.type} />}>
            <div className="flex flex-wrap gap-2">
              {leadStatusSteps(lead.type).map((status) => {
                const Icon = STATUS_ICONS[status];
                return (
                  <ChoiceAct key={status} action={setStatusAction.bind(null, lead.id)} set={{ status }} back={statusBack} active={lead.status === status} done={`${lead.name}: ${leadStatusLabel(lead.type, status)}`}>
                    <Icon className="size-4" />
                    {leadStatusLabel(lead.type, status)}
                  </ChoiceAct>
                );
              })}
            </div>
            {/* Why it was lost, for the reports. Only on a lost lead, and not on a closed warranty request, which was no sale. */}
            {lead.status === "lost" && lead.type !== "warranty" && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-meta font-medium">Why was it lost?</legend>
                <div className="flex flex-wrap gap-2">
                  {LOST_REASONS.map((r) => (
                    <ChoiceAct key={r} action={setLostReasonAction.bind(null, lead.id)} set={{ reason: r }} back={lead.lostReason && { reason: lead.lostReason }} active={lead.lostReason === r} done={`Lost: ${r}`}>
                      {r}
                    </ChoiceAct>
                  ))}
                </div>
              </fieldset>
            )}
          </Panel>
          {/* A factory order request from the website: place it, copying from what they asked for. Orders are for stock kept here. */}
          {lead.type === "order" && (await stockSource()) !== "donedeal" && (
            <IfModule id="newCars">
              <Panel title="Factory order" className="max-lg:order-3">
                <Link href={`/dashboard/orders/new?lead=${lead.id}`} className={`${adminButton} w-fit`}>Place the order</Link>
              </Panel>
            </IfModule>
          )}
          {/* A warranty claim from the website: open it on the sale, with the buyer found from their details. */}
          {lead.type === "warranty" && (
            <IfModule id="service">
              <Panel title="Warranty" className="max-lg:order-3">
                <Link href={`/dashboard/aftersales/new?lead=${lead.id}`} className={`${adminButton} w-fit`}>Open a claim</Link>
              </Panel>
            </IfModule>
          )}
          {/* The day to get back to them. Only while the lead is open: won and lost need none. */}
          {isOpenLead(lead) && (
            <Panel title="Follow up" className="max-lg:order-4" action={lead.followUpOn && <Badge tone={followUpDue(lead, today) ? "warn" : "neutral"}>{lead.followUpOn === today ? "Today" : fmtDate(`${lead.followUpOn}T12:00:00Z`)}</Badge>}>
              <div className="flex flex-wrap gap-2">
                {([[1, "Tomorrow"], [3, "In 3 days"], [7, "Next week"]] as const).map(([n, label]) => (
                  <ChoiceAct key={n} action={setFollowUpAction.bind(null, lead.id)} set={{ in: String(n) }} back={followUpBack} active={false} done={`Follow up ${label.toLowerCase()}`}>
                    {label}
                  </ChoiceAct>
                ))}
              </div>
              <form action={setFollowUpAction.bind(null, lead.id)} className="flex flex-wrap items-end gap-2">
                <Field label="Or a day" className="w-44">
                  <input type="date" name="on" min={today} defaultValue={lead.followUpOn ?? ""} required className={adminInput} />
                </Field>
                <SubmitButton className={adminButtonQuiet}>
                  Set
                </SubmitButton>
              </form>
              {lead.followUpOn && (
                <ChoiceAct action={setFollowUpAction.bind(null, lead.id)} set={{ clear: "1" }} back={followUpBack} active={false} done="Follow-up cleared" className={`${rowButton} w-fit text-bad`}>
                  Clear the follow-up
                </ChoiceAct>
              )}
            </Panel>
          )}
          <Panel title="Who has it" className="max-lg:order-5">
            <div className="flex flex-wrap gap-2">
              <ChoiceAct action={assignLeadAction.bind(null, lead.id)} set={{ assignedTo: "" }} back={{ assignedTo: lead.assignedTo ?? "" }} active={!lead.assignedTo} done="Given to nobody">
                Nobody
              </ChoiceAct>
              {settings.team.map((t) => (
                <ChoiceAct key={t.id} action={assignLeadAction.bind(null, lead.id)} set={{ assignedTo: t.name }} back={{ assignedTo: lead.assignedTo ?? "" }} active={lead.assignedTo === t.name} done={`Given to ${t.name}`}>
                  <Avatar name={t.name} className="-ml-2 size-7 bg-card" />
                  {t.name}
                </ChoiceAct>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
