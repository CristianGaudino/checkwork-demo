import { Field, Panel, adminButton, adminInput } from "@/components/admin/kit";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { fmtDateTime } from "@/lib/admin/format";
import { NOTE_MAX } from "@/lib/admin/notes";

// The notes on a lead, order or claim, oldest first, and a box to add one. `action` is the area's add-note action bound to the record.
export function NotesPanel({ notes, action, className }: { notes: { at: number; text: string }[]; action: (data: FormData) => Promise<void>; className?: string }) {
  return (
    <Panel title="Notes" className={className}>
      {notes.length === 0 ? (
        <p className="text-body text-text-2">No notes yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline">
          {[...notes].sort((a, b) => a.at - b.at).map((n) => ( // by time: a buyer's WhatsApp answer is written before the question that caused it
            <li key={n.at} className="flex flex-col gap-0.5 py-2">
              <span className="whitespace-pre-line text-body">{n.text}</span>
              <span className="text-meta text-text-2">{fmtDateTime(n.at)}</span>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="flex flex-col gap-3">
        <Field label="Add a note">
          <textarea name="note" rows={3} maxLength={NOTE_MAX} required className={`${adminInput} h-auto py-2`} />
        </Field>
        <SubmitButton className={`${adminButton} self-start`}>Add note</SubmitButton>
      </form>
    </Panel>
  );
}
