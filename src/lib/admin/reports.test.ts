import { describe, expect, it } from "vitest";
import type { Lead, Sale } from "./collections";
import type { Car } from "@/lib/stock/types";
import { fullReport, monthsOf, personalReport } from "./reports";

const now = Date.parse("2026-11-11T12:00:00Z");
const sale = (id: string, soldOn: string, priceEur: number, salesperson?: string): Sale => ({ id, carTitle: id, priceEur, soldOn, salesperson, createdAt: 0 });
const lead = (id: string, at: string, o: Partial<Lead> = {}) => ({ id, status: "new", source: "Website", createdAt: Date.parse(`${at}T12:00:00Z`), ...o }) as Lead;
const car = (id: string, listedAt: string, o: Partial<Car> = {}) => ({ id, listedAt, priceEur: 10000, photos: [], ...o }) as Car;

describe("monthsOf", () => {
  it("counts whole months back from this one, across a year end", () => {
    expect(monthsOf(3, "2026-11-11")).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(monthsOf(3, "2026-01-31")).toEqual(["2025-11", "2025-12", "2026-01"]);
  });
});

describe("fullReport", () => {
  const input = {
    sales: [sale("a", "2026-11-02", 12000, "Conor"), sale("b", "2026-10-20", 9000, "Aoife"), sale("c", "2026-10-01", 5000), sale("old", "2026-07-01", 7000, "Conor"), { ...sale("ret-1", "2026-10-02", 15000, "Conor"), carId: "z", returnedOn: "2026-10-20", kind: "returned" as const, refundEur: 15000 }],
    cars: [car("a", "2026-10-03", { soldAt: "2026-11-02" }), car("b", "2026-10-10", { soldAt: "2026-10-20" }), car("new", "2026-11-01"), car("aged", "2026-08-01", { priceEur: 8000 })],
    leads: [lead("1", "2026-11-01", { assignedTo: "Conor", status: "won", source: "Phone" }), lead("2", "2026-10-05", { assignedTo: "Conor" }), lead("3", "2026-10-06", { source: "Phone" }), lead("x", "2026-06-01", { assignedTo: "Conor", status: "won" })],
    team: ["Aoife", "Conor", "Niamh"],
    costs: new Map([["a", 10000], ["b", 8500]]),
    prep: [{ id: "a", lines: [{ kind: "Tyres" as const, eur: 300, at: Date.parse("2026-10-05") }, { kind: "Valet" as const, eur: 100, at: Date.parse("2026-05-01") }] }],
    period: 3 as const,
    now,
  };
  const r = fullReport(input);

  it("totals the period's sales, profit only where a cost is known, and the average days to sell", () => {
    expect(r.months.map((m) => [m.month, m.sold, m.value])).toEqual([["2026-09", 0, 0], ["2026-10", 2, 14000], ["2026-11", 1, 12000]]);
    expect(r.totals).toEqual({ sold: 3, value: 26000, profit: 2000 + 500, costed: 2, avgDaysToSell: Math.round((30 + 10) / 2) });
  });
  it("leaves a returned sale out of the sales and counts it, with its refund, as a return", () => {
    expect(r.returns).toEqual({ count: 1, refundEur: 15000 });
    expect(personalReport({ name: "Conor", sales: input.sales, leads: [], period: 3, now }).totals.sold).toBe(1);
  });
  it("ranks the people who sold or had leads, and keeps someone no longer on the team", () => {
    expect(r.people.map((p) => [p.name, p.sold, p.leads, p.won, p.winRate])).toEqual([["Conor", 1, 2, 1, 50], ["Aoife", 1, 0, 0, 0]]);
    const gone = fullReport({ ...input, team: [] });
    expect(gone.people.map((p) => p.name)).toEqual(["Conor", "Aoife"]);
  });
  it("shows which lead sources win, the stock by age, and the period's prep by kind", () => {
    expect(fullReport({ ...input, leads: [lead("l1", "2026-11-01", { status: "lost", lostReason: "Price" }), lead("l2", "2026-11-02", { status: "lost", lostReason: "Price" }), lead("l3", "2026-11-03", { status: "lost" })] }).lost).toEqual([{ reason: "Price", leads: 2 }, { reason: "Not said", leads: 1 }]);
    expect(r.sources).toEqual([{ source: "Phone", leads: 2, won: 1, winRate: 50 }, { source: "Website", leads: 1, won: 0, winRate: 0 }]);
    expect(r.stockAge.map((b) => [b.band, b.cars, b.value])).toEqual([["Under 30 days", 1, 10000], ["30 to 59 days", 0, 0], ["60 to 89 days", 0, 0], ["90 days or more", 1, 8000]]);
    expect(r.prep).toEqual([{ kind: "Tyres", eur: 300, lines: 1 }]);
  });
});

describe("personalReport", () => {
  it("counts only their own sales and leads, never money", () => {
    const p = personalReport({
      name: "Conor",
      sales: [sale("a", "2026-11-02", 12000, "Conor"), sale("b", "2026-11-03", 9000, "Aoife")],
      leads: [lead("1", "2026-11-01", { assignedTo: "Conor", status: "won" }), lead("2", "2026-10-05", { assignedTo: "Conor", status: "contacted", followUpOn: "2026-11-10" }), lead("3", "2026-11-01", { assignedTo: "Aoife" })],
      period: 3,
      now,
    });
    expect(p.totals).toEqual({ sold: 1, leads: 2, won: 1, winRate: 50, followUpsDue: 1 });
    expect(JSON.stringify(p)).not.toMatch(/12000|9000|value|profit/);
  });
});
