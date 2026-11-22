import { TIME_ZONE as timeZone } from "@/lib/site";
import { HOUR } from "@/lib/time";

// Irish time, whatever zone the server runs in (a Worker runs in UTC): a 11:00 test drive reads 11:00 in summer too. No server-only
// imports: the lead forms use these in the browser.
// A calendar day (YYYY-MM-DD) in words, read at noon UTC so no zone moves it to the day before: "Thursday, 12 November".
const longDay = new Intl.DateTimeFormat("en-IE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

// Some engines write September "Sept" beside "Oct": every short month is three letters.
export const threeLetter = (s: string) => s.replace("Sept", "Sep");
// "09:00" -> "9am", "17:30" -> "5:30pm", "12:00" -> "12pm": how the opening hours read, and the test drive times with them.
export const clock12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
};
export const fmtDay = (iso: string) => threeLetter(longDay.format(new Date(`${iso}T12:00:00Z`)));
// The Irish calendar day of a moment, as YYYY-MM-DD, and a day n days on.
export const dublinDay = (t: number = Date.now()) => new Date(t).toLocaleDateString("en-CA", { timeZone });
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
