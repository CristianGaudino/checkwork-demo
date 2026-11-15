// A half-filled lead form kept for this tab only (sessionStorage), so a reload or a wrong tap does not lose what was typed. Never the
// contact details or the consent: the browser fills the details again by itself, and keeping less personal data is the rule. Gone when
// the form is sent, or when the tab closes.
const NEVER = new Set(["name", "phone", "email", "consent"]);

// What is worth keeping: typed fields that differ from what the page filled in itself.
export function draftOf(values: Record<string, string>, prefill: Record<string, string> = {}): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([k, v]) => !NEVER.has(k) && v.trim() !== "" && v !== prefill[k]));
}

export function readDraft(key: string): Record<string, string> {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return draftOf(Object.fromEntries(Object.entries(value).filter((e): e is [string, string] => typeof e[1] === "string")));
  } catch {
    return {}; // storage blocked or edited: start empty
  }
}

export function saveDraft(key: string, values: Record<string, string>, prefill?: Record<string, string>) {
  const draft = draftOf(values, prefill);
  try {
    if (Object.keys(draft).length) sessionStorage.setItem(key, JSON.stringify(draft));
    else sessionStorage.removeItem(key);
  } catch {
    // storage full or blocked: the form still works, it just is not kept
  }
}
