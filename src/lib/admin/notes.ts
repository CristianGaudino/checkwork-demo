// A note on a lead, order or claim: the longest one the box takes, and the one way it is added.
export const NOTE_MAX = 500;

type Noted = { notes: { at: number; text: string }[] };

// Adds the form's note through the store's safe read-modify-write. Undefined when there is no note or the record is gone, so the caller
// logs nothing. The caller checks staff and the module first, and logs the activity without the note's text.
export async function appendNote<T extends Noted>(store: { update(id: string, fn: (doc: T) => T | Promise<T>): Promise<T | undefined> }, id: string, data: FormData): Promise<T | undefined> {
  const text = String(data.get("note") ?? "").trim().slice(0, NOTE_MAX);
  if (!text) return;
  return store.update(id, (d) => ({ ...d, notes: [...d.notes, { at: Date.now(), text }] }));
}
