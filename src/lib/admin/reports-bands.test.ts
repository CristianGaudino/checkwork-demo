import { describe, expect, it, vi } from "vitest";
import type { Car } from "@/lib/stock/types";

// A dealer who sets old stock at 45 days: the bands stop short of it, so no car is counted twice.
vi.mock("@/lib/dealer.config", () => ({ DEALER_RULES: { oldStockDays: 45, slowDropEur: 500, soldVisibleDays: 30, saleNudgeDays: 90 } }));
const { fullReport } = await import("./reports");

describe("stock age bands", () => {
  it("end at the dealer's old stock age, each car in one band", () => {
    const now = Date.parse("2026-11-16T12:00:00Z");
    const car = (id: string, listedAt: string) => ({ id, slug: id, priceEur: 1000, photos: [], listedAt }) as unknown as Car;
    const r = fullReport({ leads: [], sales: [], team: [], prep: [], cars: [car("a", "2026-11-10"), car("b", "2026-10-10"), car("c", "2026-09-01")], period: 3, now } as never);
    expect(r.stockAge.map((b) => [b.band, b.cars])).toEqual([["Under 30 days", 1], ["30 to 44 days", 1], ["45 days or more", 1]]);
  });
});
