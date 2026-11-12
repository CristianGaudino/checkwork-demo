import { TIME_ZONE as timeZone } from "@/lib/site";
import { HOUR } from "@/lib/time";

// Irish time, whatever zone the server runs in (a Worker runs in UTC): a 11:00 test drive reads 11:00 in summer too. No server-only
// imports: the lead forms use these in the browser.
const date = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric", timeZone });
const dateTime = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone });
const num = new Intl.NumberFormat("en-IE");
const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const time = new Intl.DateTimeFormat("en-IE", { hour: "2-digit", minute: "2-digit", timeZone });
// A calendar day (YYYY-MM-DD) in words, read at noon UTC so no zone moves it to the day before: the diary's headings and day strips.
const utc = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IE", { ...o, timeZone: "UTC" });
const DAY_STYLES = {
  long: utc({ weekday: "long", day: "numeric", month: "long" }), // Thursday, 12 November
  dayMonth: utc({ day: "numeric", month: "long" }), // 12 November
  weekday: utc({ weekday: "short" }), // Thu
  day: utc({ day: "numeric" }), // 12
  month: utc({ month: "short" }), // Nov
} as const;

export const fmtDate = (t: number | string) => date.format(new Date(t));
export const fmtTime = (t: number) => time.format(t);
export const fmtDay = (iso: string, style: keyof typeof DAY_STYLES = "long") => DAY_STYLES[style].format(new Date(`${iso}T12:00:00Z`));
// Whole days from a listed day (YYYY-MM-DD) to now, never below 0: how long a car has been in stock.
export const daysSince = (day: string, now = Date.now()) => Math.max(0, Math.floor((now - Date.parse(`${day}T00:00:00Z`)) / 86_400_000));
export const fmtDateTime = (t: number | string) => dateTime.format(new Date(t));
export const fmtNum = (n: number) => num.format(n);
// A count with its word, singular for one: "1 review", "12 reviews", "1,284 cars".
export const plural = (n: number, one: string, many = `${one}s`) => `${fmtNum(n)} ${n === 1 ? one : many}`;
// The Irish calendar day of a moment, as YYYY-MM-DD ("today" for follow-ups and sales), and a day n days on.
export const dublinDay = (t: number = Date.now()) => new Date(t).toLocaleDateString("en-CA", { timeZone });
export const dublinDateTime = (t: number) => new Date(t).toLocaleString("sv-SE", { timeZone }).slice(0, 16); // "2026-11-11 14:30", as spreadsheets read it
// A real calendar day as YYYY-MM-DD. The shape alone lets "2026-13-45" through (and the page that shows it then fails), and JavaScript reads
// "2026-02-31" as 3 March, so the day must read back as itself.
export const isIsoDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`)) && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s;
export const isIsoMonth = (s: string) => /^\d{4}-\d{2}$/.test(s) && isIsoDay(`${s}-01`);
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
// A day and a time said in Irish time, as the moment they mean. Tries the offset twice so the hour that clocks change on still lands right.
export function dublinMs(date: string, time: string): number {
  const guess = Date.parse(`${date}T${time}:00Z`);
  const offset = (ms: number) => {
    const name = new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "shortOffset" }).formatToParts(new Date(ms)).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    return Number(/GMT([+-]\d+)?/.exec(name)?.[1] ?? 0) * HOUR;
  };
  return guess - offset(guess - offset(guess));
}
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
