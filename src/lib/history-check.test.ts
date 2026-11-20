import { afterEach, describe, expect, it, vi } from "vitest";
import demoCars from "@/lib/stock/demo-cars.json";
import type { Car } from "@/lib/stock/types";

vi.mock("server-only", () => ({}));
const { demoReg, historyFor, historyProblems, historyRows, historyStore, publicHistory, runHistoryCheck, simulateHistory } = await import("./history-check");
const { parseIrishReg } = await import("./reg");

const cars = demoCars as Car[];
const car = { ...cars[0], condition: "used" } as Car;
const TODAY = "2026-11-20";

afterEach(() => vi.unstubAllEnvs());

describe("simulated history check", () => {
  it("gives the same answer for the same plate", () => {
    expect(simulateHistory("191-D-1234", car, TODAY)).toEqual(simulateHistory("191-d-1234", car, TODAY));
  });
  it("is clear for almost every plate, and finds each kind of problem on some", () => {
    const reports = Array.from({ length: 2000 }, (_, i) => simulateHistory(`191-D-${i}`, car, TODAY));
    const bad = reports.filter((r) => historyProblems(r).length > 0);
    expect(bad.length / reports.length).toBeLessThan(0.08);
    expect(bad.some((r) => r.financeOwed) && bad.some((r) => r.writeOff) && bad.some((r) => !r.mileage.consistent)).toBe(true);
  });
  it("never puts a clear car's last reading above its advertised mileage", () => {
    for (let i = 0; i < 500; i++) {
      const r = simulateHistory(`201-KY-${i}`, car, TODAY);
      if (r.mileage.consistent && r.mileage.lastKm) expect(r.mileage.lastKm).toBeLessThanOrEqual(car.mileageKm!);
    }
  });
  it("makes a valid Irish plate for each demo car, and most demo cars come back clear", () => {
    expect(cars.every((c) => parseIrishReg(demoReg(c)))).toBe(true);
    const clear = cars.filter((c) => historyProblems(simulateHistory(demoReg(c), c, TODAY)).length === 0);
    expect(clear.length).toBeGreaterThan(cars.length * 0.85);
  });
});

describe("badge and report", () => {
  const check = { id: "1", reg: "191-D-1", checkedOn: TODAY, financeOwed: false, mileage: { consistent: true, lastKm: 50_000, readOn: "2026-06-01" }, owners: 2, importedFrom: "the UK", nct: { on: "2026-03-02", passed: true } };
  it("shows a clear check, and nothing for one with a problem", () => {
    expect(publicHistory(check)).toBe(check);
    expect(publicHistory({ ...check, financeOwed: true })).toBeNull();
    expect(publicHistory({ ...check, writeOff: "C" })).toBeNull();
    expect(publicHistory({ ...check, mileage: { consistent: false } })).toBeNull();
    expect(publicHistory(null)).toBeNull();
  });
  it("names each problem plainly", () => {
    expect(historyProblems({ ...check, financeOwed: true, writeOff: "C", mileage: { consistent: false } })).toEqual(["Finance is owed on it", "Written off, category C", "The mileage does not match its records"]);
  });
  it("keeps the plate off both, and the reading for staff only", () => {
    const pub = Object.fromEntries(historyRows(check));
    expect(pub).toMatchObject({ "Finance owed": "None", "Written off": "No", Mileage: "Matches its records", Owners: "2", Imported: "Yes, from the UK" });
    expect(pub.Registration).toBeUndefined();
    const staff = Object.fromEntries(historyRows(check, true));
    expect(staff.Registration).toBeUndefined();
    expect(staff.Mileage).toContain("50,000 km");
  });
});

describe("historyFor and runHistoryCheck", () => {
  it("on the demo, a used car has a check and a new car none", async () => {
    expect(await historyFor(car)).toMatchObject({ id: car.id, reg: demoReg(car) });
    expect(await historyFor({ ...car, condition: "new" })).toBeNull();
  });
  it("with simulation off and no key: no check, and running one does nothing", async () => {
    vi.stubEnv("SIMULATE_INTEGRATIONS", "off");
    expect(await historyFor(car)).toBeNull();
    expect(await runHistoryCheck(car, "191-D-1", TODAY)).toBeNull();
  });
  it("keeps a check that is run, and a failed service keeps nothing", async () => {
    const c = { ...car, id: "990001" };
    const run = await runHistoryCheck(c, "191-D-77", TODAY);
    expect(await historyFor(c)).toEqual(run);
    vi.stubEnv("HISTORY_CHECK_API_KEY", "k");
    const fails = { ...car, id: "990002" };
    expect(await runHistoryCheck(fails, "191-D-78", TODAY, async () => { throw new Error("down"); })).toBeNull();
    expect(await historyFor(fails)).toBeNull(); // live, never checked: nothing
    await historyStore.remove(c.id);
  });
});
