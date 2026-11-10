import { NEW_TAB } from "@/components/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadStatusBadge } from "@/components/admin/badges";
import { Avatar, ChoiceButton, Field, PageHeader, Panel, adminButton, adminButtonQuiet, adminInput } from "@/components/admin/kit";
import { LEAD_STATUS_LABELS, LEAD_TYPE_LABELS, getSettings, leadsStore } from "@/lib/admin/collections";
import { fmtDateTime } from "@/lib/admin/format";
import { CalendarIcon, CheckIcon, CloseIcon, PhoneIcon } from "@/components/stock/icons";
import type { LeadStatus } from "@/lib/admin/collections";
import { addNoteAction, assignLeadAction, setStatusAction } from "../actions";

// The quick actions on a lead: the steps it moves through. New is where it starts, so it has no button.
const STATUS_ACTIONS: { status: LeadStatus; Icon: typeof PhoneIcon }[] = [
  { status: "contacted", Icon: PhoneIcon },
  { status: "appointment", Icon: CalendarIcon },
  { status: "won", Icon: CheckIcon },
  { status: "lost", Icon: CloseIcon },
];

export const metadata = { title: "Lead" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lead, settings] = await Promise.all([leadsStore.get(id), getSettings()]);
  if (!lead) notFound();
  const wa = lead.phone.replace(/[^\d]/g, "");

  return (
    <>
      <PageHeader
        title={lead.name}
        text={`${LEAD_TYPE_LABELS[lead.type]} · ${lead.source} · ${fmtDateTime(lead.createdAt)}`}
        actions={
          <Link href="/dashboard/leads" className={adminButtonQuiet}>
            All leads
          </Link>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Message">
            <p className="max-w-measure text-body">{lead.message}</p>
            {lead.carTitle && lead.carSlug && (
              <p className="text-meta text-text-2">
                About{" "}
                <Link href={`/used-cars/${lead.carSlug}`} className="font-semibold text-text underline">
                  {lead.carTitle}
                </Link>
              </p>
            )}
          </Panel>
          <Panel title="Notes">
            {lead.notes.length === 0 ? (
              <p className="text-body text-text-2">No notes yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-hairline">
                {lead.notes.map((n) => (
                  <li key={n.at} className="flex flex-col gap-0.5 py-2">
                    <span className="text-body">{n.text}</span>
                    <span className="text-meta text-text-2">{fmtDateTime(n.at)}</span>
                  </li>
                ))}
              </ul>
            )}
            <form action={addNoteAction.bind(null, lead.id)} className="flex flex-col gap-3">
              <Field label="Add a note">
                <textarea name="note" rows={3} maxLength={500} required className={`${adminInput} h-auto py-2`} />
              </Field>
              <button type="submit" className={`${adminButton} self-start`}>
                Add note
              </button>
            </form>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-6 max-lg:order-first">
          <Panel title="Status" action={<LeadStatusBadge status={lead.status} />}>
            <div className="flex flex-wrap gap-2">
              {STATUS_ACTIONS.map(({ status, Icon }) => (
                <ChoiceButton key={status} action={setStatusAction.bind(null, lead.id)} name="status" value={status} active={lead.status === status}>
                  <Icon className="size-4" />
                  {LEAD_STATUS_LABELS[status]}
                </ChoiceButton>
              ))}
            </div>
          </Panel>
          <Panel title="Who has it">
            <div className="flex flex-wrap gap-2">
              <ChoiceButton action={assignLeadAction.bind(null, lead.id)} name="assignedTo" value="" active={!lead.assignedTo}>
                Nobody
              </ChoiceButton>
              {settings.team.map((t) => (
                <ChoiceButton key={t.id} action={assignLeadAction.bind(null, lead.id)} name="assignedTo" value={t.name} active={lead.assignedTo === t.name}>
                  <Avatar name={t.name} className="-ml-2 size-7 bg-card" />
                  {t.name}
                </ChoiceButton>
              ))}
            </div>
          </Panel>
          <Panel title="Contact">
            <ul className="flex flex-col gap-1">
              <li>
                <a href={`mailto:${lead.email}`} className="inline-flex min-h-11 items-center break-all underline">
                  {lead.email}
                </a>
              </li>
              <li>
                <a href={`tel:${wa}`} className="inline-flex min-h-11 items-center underline">
                  {lead.phone}
                </a>
              </li>
              <li>
                <a href={`https://wa.me/${wa}`} {...NEW_TAB} className="inline-flex min-h-11 items-center underline">
                  WhatsApp<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
