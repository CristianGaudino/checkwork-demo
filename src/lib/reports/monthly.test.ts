import { describe, expect, it } from "vitest";
import type { AdminReview, Lead, Sale } from "@/lib/admin/collections";
import type { Car } from "@/lib/stock/types";
import { advice, bounds, compare, median, monthBefore, monthRange, openingAt, summarise, type ReportData } from "./monthly";

const lead = (at: string, o: Partial<Lead> = {}) => ({ id: at, type: "enquiry", status: "new", source: "Website", notes: [], createdAt: Date.parse(at), ...o }) as Lead;
const car = (id: string, o: Partial<Car>) => ({ id, slug: id, priceEur: 10000, photos: [], ...o }) as Car;
const empty: ReportData = { leads: [], cars: [], sales: [], reviews: [] };

describe("month bounds", () => {
  it("runs on Irish midnights, so March (the clocks go forward on the 29th) ends at 23:00 UTC", () => {
    expect(bounds("2026-03-01", "2026-03-31")).toEqual([Date.parse("2026-03-01T00:00:00Z"), Date.parse("2026-03-31T23:00:00Z")]);
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthBefore("2026-01")).toBe("2025-12");
  });
});

describe("openingAt", () => {
  it("reads the weekday and the hours in Irish time, summer and winter", () => {
    expect(openingAt(Date.parse("2026-03-02T10:00:00Z"))).toEqual({ weekday: 0, open: true }); // Monday 10:00 GMT
    expect(openingAt(Date.parse("2026-07-06T08:15:00Z"))).toEqual({ weekday: 0, open: false }); // Monday 09:15 IST, before opening
  });
});

describe("summarise", () => {
  const now = Date.parse("2026-04-10T12:00:00Z");
  const data: ReportData = {
    leads: [
      lead("2026-03-02T10:00:00Z", { notes: [{ at: Date.parse("2026-03-02T10:30:00Z"), text: "x" }] }), // Monday, in hours, 30 minutes
      lead("2026-03-07T18:00:00Z", { type: "finance", notes: [{ at: Date.parse("2026-03-07T20:00:00Z"), text: "x" }] }), // Saturday evening, 120
      lead("2026-03-08T12:00:00Z", { source: "Phone" }), // Sunday, never answered
      lead("2026-03-31T21:30:00Z"), // 22:30 Irish time on the 31st: March, out of hours, never answered
      lead("2026-03-31T23:30:00Z"), // 00:30 Irish time on 1 April: April, not March
    ],
    cars: [car("a", { listedAt: "2026-03-05", soldAt: "2026-03-20" }), car("b", { listedAt: "2026-02-01" }), car("c", { listedAt: "2026-04-01", wasPriceEur: 11000 })],
    sales: [{ id: "a", priceEur: 9000, soldOn: "2026-03-20" }, { id: "x", priceEur: 5000, soldOn: "2026-03-21", returnedOn: "2026-03-25" }] as Sale[],
    reviews: [{ rating: 5, createdAt: Date.parse("2026-03-10T10:00:00Z") }, { rating: 4, createdAt: Date.parse("2026-03-11T10:00:00Z") }, { rating: 1, createdAt: Date.parse("2026-04-02T10:00:00Z") }] as AdminReview[],
  };
  const s = summarise(data, "2026-03-01", "2026-03-31", now);

  it("counts the month's leads by Irish day, so a clock change moves none into the wrong month", () => {
    expect(s.leads.total).toBe(4);
    expect(s.leads.outOfHours).toBe(3);
    expect(s.leads.byWeekday).toEqual([1, 1, 0, 0, 0, 1, 1]);
    expect(s.leads.byType).toEqual({ enquiry: 3, finance: 1 });
    expect(s.leads.bySource).toEqual({ Website: 3, Phone: 1 });
  });
  it("does not count the site's own note at the moment a lead came in as a reply", () => {
    const at = "2026-03-03T10:00:00Z";
    const told = summarise({ ...empty, leads: [lead(at, { notes: [{ at: Date.parse(at), text: "The email about this lead didn't reach you" }] })] }, "2026-03-01", "2026-03-31", now);
    expect(told.replies).toEqual({ medianInHoursMin: null, medianOutOfHoursMin: null, none: 1 });
    const later = Date.parse(at) + 600_000; // a call-back reminder or a buyer's answer, written by the site
    const auto = summarise({ ...empty, leads: [lead(at, { notes: [{ at: later, text: "Call back asked for from WhatsApp.", auto: true }] })] }, "2026-03-01", "2026-03-31", now);
    expect(auto.replies.none).toBe(1);
  });
  it("works out the replies", () => {
    expect(s.replies).toEqual({ medianInHoursMin: 30, medianOutOfHoursMin: 120, none: 2 });
  });
  it("counts the stock, the sales (an undone one is not) and the reviews", () => {
    expect(s.stock).toMatchObject({ inStock: 2, added: 1, sold: 1, over45Days: 1, priceDrops: 1 });
    expect(s.sales).toEqual({ count: 1 });
    expect(summarise(data, "2026-03-01", "2026-03-31", now, { money: true }).sales.valueEur).toBe(9000);
    expect(s.reviews).toEqual({ count: 2, average: 4.5 });
  });
  it("says nothing about people", () => {
    expect(JSON.stringify(s)).not.toMatch(/"name"|"email"|"phone"|"message"|@/);
  });
  it("is all zeros and nulls for a month with nothing", () => {
    const e = summarise(empty, "2026-03-01", "2026-03-31", now);
    expect(e.leads).toEqual({ total: 0, byType: {}, bySource: {}, byWeekday: [0, 0, 0, 0, 0, 0, 0], outOfHours: 0 });
    expect(e.replies).toEqual({ medianInHoursMin: null, medianOutOfHoursMin: null, none: 0 });
    expect(e.stock.avgDaysInStock).toBeNull();
    expect(e.reviews.average).toBeNull();
  });
});

describe("compare, median and advice", () => {
  it("will not compare small numbers", () => {
    expect(compare(4, 20)).toBe("Too few to compare");
    expect(compare(20, 4)).toBe("Too few to compare");
    expect(compare(12, 10)).toBe("Up 20% on the month before");
    expect(compare(5, 10)).toBe("Down 50% on the month before");
    expect(compare(10, 10)).toBe("The same as the month before");
  });
  it("takes the middle", () => {
    expect([median([]), median([5]), median([1, 9, 3]), median([1, 2, 3, 10])]).toEqual([null, 5, 3, 3]);
  });
  it("gives one line from the first rule that applies", () => {
    const base = summarise(empty, "2026-03-01", "2026-03-31", 0);
    expect(advice({ ...base, stock: { ...base.stock, over45Days: 6 } })).toBe("6 cars over 45 days: a price drop on these could move them.");
    expect(advice({ ...base, stock: { ...base.stock, over45Days: 1 } })).toBe("1 car over 45 days: a price drop on this one could move it.");
    expect(advice({ ...base, replies: { ...base.replies, none: 2 } })).toMatch(/^2 leads had no reply/);
    expect(advice(base)).toMatch(/^Nothing needs attention/);
  });
});
