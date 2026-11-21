import { describe, expect, it } from "vitest";
import type { AdminReview, Lead, TestDrive } from "./collections";
import { overview } from "./overview";
import { DAY, HOUR } from "@/lib/time";

const now = new Date("2026-11-10T12:00:00Z").getTime();
const lead = (id: string, ago: number, status: Lead["status"] = "new"): Lead => ({ id, type: "enquiry", status, name: id, email: "", phone: "", message: "", source: "Website", notes: [], createdAt: now - ago });
const drive = (id: string, inMs: number, status: TestDrive["status"]): TestDrive => ({ id, name: id, email: "", phone: "", carSlug: "x", carTitle: "x", startsAt: now + inMs, status, notes: "", createdAt: now });
const review = (id: string, rating: AdminReview["rating"], reply?: string): AdminReview => ({ id, author: id, rating, text: "", createdAt: now, reply });

describe("overview", () => {
  it("counts eight weeks of leads, this one last, and a usual week from the seven before it", () => {
    // Weeks back: 0 (this one) has 1, 1 has 3, 2 has 2, 3 has 2; the rest none. Usual: the middle of 3, 2, 2, 0, 0, 0, 0.
    const at = (week: number, n: number) => Array.from({ length: n }, (_, i) => lead(`w${week}-${i}`, week * 7 * DAY + (i + 1) * HOUR));
    const o = overview({ leads: [...at(0, 1), ...at(1, 3), ...at(2, 2), ...at(3, 2)], drives: [], reviews: [], now });
    expect(o.weeks).toEqual([0, 0, 0, 0, 2, 2, 3, 1]);
    expect(o.usualWeek).toBe(0);
    const busy = overview({ leads: [...at(0, 1), ...at(1, 3), ...at(2, 2), ...at(3, 2), ...at(4, 2), ...at(5, 2), ...at(6, 2)], drives: [], reviews: [], now });
    expect(busy.usualWeek).toBe(2);
  });
  it("counts this week's leads as the last week, and last week's before it", () => {
    const o = overview({ leads: [lead("a", 1 * DAY), lead("b", 6 * DAY), lead("c", 9 * DAY)], drives: [], reviews: [], now });
    expect(o.weeks.slice(-2)).toEqual([1, 2]);
  });
  it("lists drives in the next 7 days in date order, ignoring past, far-off and closed ones", () => {
    const o = overview({ leads: [], drives: [drive("late", 5 * DAY, "confirmed"), drive("soon", DAY, "requested"), drive("past", -DAY, "confirmed"), drive("far", 9 * DAY, "confirmed"), drive("done", DAY, "cancelled")], reviews: [], now });
    expect(o.upcomingDrives.map((d) => d.id)).toEqual(["soon", "late"]);
  });
  it("flags what needs attention and leaves out what does not", () => {
    const o = overview({ leads: [lead("old", 30 * HOUR), lead("fresh", HOUR)], drives: [drive("d", DAY, "requested")], reviews: [review("r", 5), review("s", 4, "thanks")], now });
    expect(o.attention.map((a) => [a.key, a.count])).toEqual([["slow", 1], ["drives", 1], ["reviews", 1]]);
    expect(overview({ leads: [], drives: [], reviews: [review("s", 5, "thanks")], now }).attention).toEqual([]);
  });
  it("flags old stock, cars with no cost, a failing sync and drives booked on a sold car", () => {
    const car = (id: string, listedAt: string, o: object = {}) => ({ id, slug: id, listedAt, photos: [], ...o }) as unknown as import("@/lib/stock/types").Car;
    const cars = [car("old", "2026-07-01"), car("new", "2026-11-01"), car("gone", "2026-08-01", { soldAt: "2026-11-05" }), car("down", "2026-11-01", { listing: "hidden", takenDownAt: "2026-11-10" })];
    const o = overview({ leads: [], drives: [{ ...drive("d", DAY, "confirmed"), carSlug: "gone" }, { ...drive("e", DAY, "confirmed"), carSlug: "down" }], reviews: [], cars, costs: new Set(["old", "down"]), syncProblem: true, now });
    expect(o.attention.map((a) => [a.key, a.count])).toEqual([["sync", 1], ["sold-drives", 2], ["taken-down", 1], ["old", 1], ["costs", 1]]);
    // Without the margins permission there is no cost item at all, and a sold car is never old stock.
    expect(overview({ leads: [], drives: [], reviews: [], cars: [car("gone", "2026-01-01", { soldAt: "2026-02-01" })], now }).attention).toEqual([]);
  });
  it("lists the records behind the to-dos in the order to work them, and today's open drives", () => {
    const o = overview({ leads: [lead("newer", 30 * HOUR), lead("older", 50 * HOUR), lead("fresh", HOUR)], drives: [drive("later", 2 * DAY, "requested"), drive("sooner", HOUR, "requested"), drive("past", -HOUR, "confirmed"), drive("off", 2 * HOUR, "cancelled")], reviews: [], now });
    expect(o.late.map((l) => l.id)).toEqual(["older", "newer"]); // the longest waiting first
    expect(o.toConfirm.map((d) => d.id)).toEqual(["sooner", "later"]);
    expect(o.todayDrives.map((d) => d.id)).toEqual(["past", "sooner"]); // this morning's still counts; a cancelled one does not
  });
  it("averages ratings, and is 0 with no reviews", () => {
    expect(overview({ leads: [], drives: [], reviews: [review("a", 5), review("b", 4)], now }).averageRating).toBe(4.5);
    expect(overview({ leads: [], drives: [], reviews: [], now }).averageRating).toBe(0);
  });
});
