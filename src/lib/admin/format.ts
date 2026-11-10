// Irish time, whatever zone the server runs in (a Worker runs in UTC): a 11:00 test drive reads 11:00 in summer too.
const timeZone = "Europe/Dublin";
const date = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric", timeZone });
const dateTime = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone });
const num = new Intl.NumberFormat("en-IE");
const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export const fmtDate = (t: number | string) => date.format(new Date(t));
export const fmtDateTime = (t: number | string) => dateTime.format(new Date(t));
export const fmtNum = (n: number) => num.format(n);
export const fmtEur = (n: number) => eur.format(n);
export const fmtPct = (n: number) => `${(Math.round(n * 10) / 10).toString()}%`;

const rtf = new Intl.RelativeTimeFormat("en-IE", { numeric: "auto" });
// "2 hours ago", "yesterday": for a list where the order of events matters more than the exact time.
export function fmtAgo(t: number | string, now = Date.now()) {
  const s = Math.round((new Date(t).getTime() - now) / 1000);
  for (const [unit, secs] of [["day", 86400], ["hour", 3600], ["minute", 60]] as const) if (Math.abs(s) >= secs) return rtf.format(Math.round(s / secs), unit);
  return "just now";
}
