import "server-only";
import { defineCollection } from "@/lib/admin/docs";
import { fmtDate, fmtDay } from "@/lib/admin/format";
import { modeOf } from "@/lib/integrations";
import { formatKm } from "@/lib/stock/format";
import { isNew, type Car } from "@/lib/stock/types";

// A vehicle history check on a used car, by its registration: finance owed, a write-off, the mileage against its records, owners, an
// import and the NCT. Cartell and MotorCheck sell it per check. Simulated like the other services (src/lib/integrations.ts): with no key
// the demo makes up a report from the plate, the same for the same plate, clear for nearly every car. Off: no check and nothing shows.
export type HistoryReport = {
  financeOwed: boolean;
  writeOff?: string; // the insurer's category, e.g. "C"; absent: never written off
  mileage: { consistent: boolean; lastKm?: number; readOn?: string }; // the last recorded reading, YYYY-MM-DD
  owners: number;
  importedFrom?: string; // e.g. "the UK"; absent: Irish from new
  nct?: { on: string; passed: boolean }; // the last test, YYYY-MM-DD; absent: none yet
};
// One per car, under the car's id. `checkedOn` is the day it ran, YYYY-MM-DD.
export type HistoryCheck = HistoryReport & { id: string; reg: string; checkedOn: string };
export const historyStore = defineCollection<HistoryCheck>("history-checks", () => []);

// The service itself. ADAPTER GOES HERE: call Cartell or MotorCheck with HISTORY_CHECK_API_KEY and map its answer; null when it does
// not know the plate.
export async function historyService(reg: string): Promise<HistoryReport | null> {
  void reg;
  throw new Error("History check adapter not installed");
}

const hashOf = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const daysBefore = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

// The demo's report: picked by the plate, so the same plate always gives the same answer. About one plate in 20 finds a problem.
export function simulateHistory(reg: string, car: Pick<Car, "year" | "mileageKm" | "owners">, today: string): HistoryReport {
  const h = hashOf(reg.toUpperCase());
  const problem = h % 60; // 0: finance owed, 1: written off, 2: mileage does not match
  const km = car.mileageKm ?? 0;
  return {
    financeOwed: problem === 0,
    ...(problem === 1 && { writeOff: "C" }),
    mileage: problem === 2 ? { consistent: false, lastKm: km + 20_000 + (h % 30_000), readOn: daysBefore(today, 400) } : { consistent: true, ...(km > 0 && { lastKm: Math.round((km * 0.92) / 100) * 100, readOn: daysBefore(today, 60 + (h % 200)) }) },
    owners: car.owners ?? 1 + (h % 3),
    ...(h % 4 === 0 && { importedFrom: "the UK" }),
    ...(Number(today.slice(0, 4)) - car.year >= 4 && { nct: { on: daysBefore(today, 30 + (h % 300)), passed: true } }),
  };
}

// A plate for a demo car, which has none on file: the car's year and its id, in the Irish form. Made up, as every record on the demo.
export const demoReg = (car: Pick<Car, "id" | "year">) => `${String(car.year).slice(2)}${car.year >= 2013 ? "1" : ""}-D-${(Number(car.id) % 99_999) + 1}`;

// What stops the site saying "checked": each in plain words.
export const historyProblems = (r: HistoryReport) => [r.financeOwed && "Finance is owed on it", r.writeOff && `Written off, category ${r.writeOff}`, !r.mileage.consistent && "The mileage does not match its records"].filter((p): p is string => Boolean(p));

// The report as rows. `staff` adds the last reading and the plate, which the public report leaves out.
export function historyRows(c: HistoryCheck, staff = false): [string, string][] {
  const m = c.mileage;
  return [
    ...(staff ? [["Registration", c.reg] as [string, string]] : []),
    ["Finance owed", c.financeOwed ? "Yes" : "None"],
    ["Written off", c.writeOff ? `Yes, category ${c.writeOff}` : "No"],
    ["Mileage", `${m.consistent ? "Matches its records" : "Does not match its records"}${staff && m.lastKm ? `, last read at ${formatKm(m.lastKm)}${m.readOn ? ` in ${fmtDay(m.readOn, "monthYear")}` : ""}` : ""}`],
    ["Owners", String(c.owners)],
    ["Imported", c.importedFrom ? `Yes, from ${c.importedFrom}` : "No"],
    ["NCT", c.nct ? `${c.nct.passed ? "Passed" : "Failed"} ${fmtDay(c.nct.on, "monthYear")}` : "None yet"],
    ["Checked", fmtDate(`${c.checkedOn}T12:00:00Z`)],
  ];
}

// The car's check, or null: none for a new car, and none at all with the service off. On the demo a car never checked has its made-up
// report, dated the day it was listed, so every used car shows one. Reads only: a visitor's page view never writes (`seed: false`).
// shortcut: lists every check to find one; fine for a dealer's stock of a few hundred, a get without seeding if it ever grows.
export async function historyFor(car: Car): Promise<HistoryCheck | null> {
  const mode = modeOf("history");
  if (mode === "off" || isNew(car)) return null;
  const saved = (await historyStore.list({ seed: false }).catch(() => [])).find((c) => c.id === car.id);
  if (saved || mode === "live") return saved ?? null;
  const reg = demoReg(car);
  const checkedOn = car.listedAt ?? new Date().toISOString().slice(0, 10);
  return { id: car.id, reg, checkedOn, ...simulateHistory(reg, car, checkedOn) };
}

// The public badge: only a clear check. One that finds a problem shows nothing on the site, never "checked"; the dashboard says why.
export const publicHistory = (c: HistoryCheck | null) => (c && historyProblems(c).length === 0 ? c : null);

// Runs the check now and keeps it. Null with the service off, or when the service does not know the plate or fails.
export async function runHistoryCheck(car: Car, reg: string, today: string, service = historyService): Promise<HistoryCheck | null> {
  const mode = modeOf("history");
  if (mode === "off") return null;
  let report: HistoryReport | null;
  try {
    report = mode === "simulated" ? simulateHistory(reg, car, today) : await service(reg);
  } catch {
    return null;
  }
  if (!report) return null;
  const check = { id: car.id, reg, checkedOn: today, ...report };
  await historyStore.put(check);
  return check;
}
