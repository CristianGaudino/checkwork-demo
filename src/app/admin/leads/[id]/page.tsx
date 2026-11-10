import { NEW_TAB } from "@/components/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadStatusBadge } from "@/components/admin/badges";
import { Field, PageHeader, Panel, adminButton, adminButtonQuiet, adminInput } from "@/components/admin/kit";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_TYPE_LABELS, getSettings, leadsStore } from "@/lib/admin/collections";
import { fmtDateTime } from "@/lib/admin/format";
import { addNoteAction, updateLeadAction } from "../actions";

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
          <Link href="/admin/leads" className={adminButtonQuiet}>
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

        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Status" action={<LeadStatusBadge status={lead.status} />}>
            <form action={updateLeadAction.bind(null, lead.id)} className="flex flex-col gap-4">
              <Field label="Status">
                <select name="status" defaultValue={lead.status} className={adminInput}>
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {LEAD_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Who has it">
                <select name="assignedTo" defaultValue={lead.assignedTo ?? ""} className={adminInput}>
                  <option value="">Nobody yet</option>
                  {settings.team.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <button type="submit" className={`${adminButton} self-start`}>
                Save
              </button>
            </form>
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
