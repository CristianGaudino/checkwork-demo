// Finding a person by what they gave us: an email, or a phone number in any of the ways people write one (087 123 4567, +353 87 123 4567,
// 00353871234567 all match). Pure, so the matching is tested.
export type PersonQuery = { email?: string; phone?: string };

const digits = (s: string) => s.replace(/\D/g, "");
// The last nine digits: an Irish mobile or landline without its 0 or +353, so every way of writing it matches.
const phoneKey = (s: string) => digits(s).slice(-9);
const MIN_PHONE_DIGITS = 7;

export function parsePersonQuery(raw: string): PersonQuery | null {
  const q = raw.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q)) return { email: q.toLowerCase() };
  return digits(q).length >= MIN_PHONE_DIGITS ? { phone: phoneKey(q) } : null;
}

// Several ways to reach the same person: a match on any of them.
export const matchesAny = (rec: { email?: string | null; phone?: string | null }, qs: PersonQuery[]) => qs.some((q) => matchesPerson(rec, q));

// The other email and phone a person's records hold, so a search by one finds what they sent with the other.
export function widen(qs: PersonQuery[], recs: { email?: string | null; phone?: string | null }[]): PersonQuery[] {
  const out = [...qs];
  for (const r of recs) {
    for (const raw of [r.email, r.phone]) {
      const q = raw ? parsePersonQuery(raw) : null;
      if (q && !out.some((o) => o.email === q.email && o.phone === q.phone)) out.push(q);
    }
  }
  return out;
}

export function matchesPerson(rec: { email?: string | null; phone?: string | null }, q: PersonQuery): boolean {
  if (q.email) return (rec.email ?? "").trim().toLowerCase() === q.email;
  if (q.phone) return digits(rec.phone ?? "").length >= MIN_PHONE_DIGITS && phoneKey(rec.phone ?? "") === q.phone;
  return false;
}
