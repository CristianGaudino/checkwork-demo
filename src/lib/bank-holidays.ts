// Ireland's public holidays (bank holidays), worked out for any year, so nothing needs updating each January. No imports: the booking
// form (client) and the server share it. The rules (Organisation of Working Time Act 1997, St Brigid's Day from 2023):
// - New Year's Day, St Patrick's Day, Christmas Day and St Stephen's Day, on their dates. One that falls on a weekend also gives the next
//   weekday that is not already a holiday (Christmas on a Saturday: the 27th and 28th).
// - St Brigid's Day: the first Monday in February, or 1 February when that is a Friday.
// - Easter Monday, the first Mondays of May, June and August, and the last Monday of October.
// shortcut: a one-off holiday the government adds (18 March 2022) is not here. Add it to EXTRA if another is announced.
const EXTRA: string[] = [];

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const weekday = (y: number, m: number, d: number) => utc(y, m, d).getUTCDay(); // 0 Sunday to 6 Saturday
const firstMonday = (y: number, m: number) => 1 + ((8 - weekday(y, m, 1)) % 7);
function lastMonday(y: number, m: number) {
  const last = utc(y, m + 1, 0).getUTCDate();
  return last - ((weekday(y, m, last) + 6) % 7);
}
// Easter Sunday in the Gregorian calendar (the anonymous Gregorian algorithm).
function easterSunday(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  return utc(y, month, ((h + l - 7 * m + 114) % 31) + 1);
}

const byYear = new Map<number, Set<string>>();
export function irishBankHolidays(y: number): Set<string> {
  const known = byYear.get(y);
  if (known) return known;
  const fixed = [utc(y, 1, 1), utc(y, 3, 17), utc(y, 12, 25), utc(y, 12, 26)];
  const easterMonday = new Date(easterSunday(y).getTime() + 86_400_000);
  const brigid = weekday(y, 2, 1) === 5 ? 1 : firstMonday(y, 2);
  const days = new Set([...fixed, easterMonday, utc(y, 2, brigid), utc(y, 5, firstMonday(y, 5)), utc(y, 6, firstMonday(y, 6)), utc(y, 8, firstMonday(y, 8)), utc(y, 10, lastMonday(y, 10))].map(iso));
  for (const d of fixed) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) continue;
    const next = new Date(d);
    do next.setUTCDate(next.getUTCDate() + 1);
    while (next.getUTCDay() === 0 || next.getUTCDay() === 6 || days.has(iso(next)));
    days.add(iso(next));
  }
  for (const e of EXTRA) if (e.startsWith(String(y))) days.add(e);
  byYear.set(y, days);
  return days;
}

/** Whether a day ("2026-12-28") is an Irish bank holiday. */
export const isBankHoliday = (day: string) => irishBankHolidays(Number(day.slice(0, 4))).has(day);
