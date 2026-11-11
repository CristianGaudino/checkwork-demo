// Irish time, whatever zone the server runs in (a Worker runs in UTC): a 11:00 test drive reads 11:00 in summer too.
const timeZone = "Europe/Dublin";
const date = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric", timeZone });
const dateTime = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone });
const num = new Intl.NumberFormat("en-IE");
const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export const fmtDate = (t: number | string) => date.format(new Date(t));
export const fmtDateTime = (t: number | string) => dateTime.format(new Date(t));
export const fmtNum = (n: number) => num.format(n);
// The Irish calendar day of a moment, as YYYY-MM-DD ("today" for follow-ups and sales), and a day n days on.
export const dublinDay = (t: number = Date.now()) => new Date(t).toLocaleDateString("en-CA", { timeZone });
export const dublinDateTime = (t: number) => new Date(t).toLocaleString("sv-SE", { timeZone }).slice(0, 16); // "2026-11-11 14:30", as spreadsheets read it
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
// The same day n months on, or the month's last day when it is shorter ("2026-12-31" plus 2 is "2027-02-28").
export function addMonths(day: string, n: number) {
  const [y, m, d] = day.split("-").map(Number);
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0));
  return new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), Math.min(d, last.getUTCDate()))).toISOString().slice(0, 10);
}
export const fmtEur = (n: number) => eur.format(n);
export const fmtPct = (n: number) => `${(Math.round(n * 10) / 10).toString()}%`;

const rtf = new Intl.RelativeTimeFormat("en-IE", { numeric: "auto" });
// "2 hours ago", "yesterday": for a list where the order of events matters more than the exact time.
export function fmtAgo(t: number | string, now = Date.now()) {
  const s = Math.round((new Date(t).getTime() - now) / 1000);
  for (const [unit, secs] of [["day", 86400], ["hour", 3600], ["minute", 60]] as const) if (Math.abs(s) >= secs) return rtf.format(Math.round(s / secs), unit);
  return "just now";
}
