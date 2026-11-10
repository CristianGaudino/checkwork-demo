import { describe, expect, it } from "vitest";
import type { AdminReview, Lead, TestDrive } from "./collections";
import { overview } from "./overview";
import { DAY, HOUR } from "@/lib/time";

const now = new Date("2026-11-10T12:00:00Z").getTime();
const lead = (id: string, ago: number, status: Lead["status"] = "new"): Lead => ({ id, type: "enquiry", status, name: id, email: "", phone: "", message: "", source: "Website", notes: [], createdAt: now - ago });
const drive = (id: string, inMs: number, status: TestDrive["status"]): TestDrive => ({ id, name: id, email: "", phone: "", carSlug: "x", carTitle: "x", startsAt: now + inMs, status, notes: "", createdAt: now });
const review = (id: string, rating: AdminReview["rating"], reply?: string): AdminReview => ({ id, author: id, rating, text: "", createdAt: now, reply });

describe("overview", () => {
  it("counts this week against the week before", () => {
    const o = overview({ leads: [lead("a", 1 * DAY), lead("b", 6 * DAY), lead("c", 9 * DAY)], drives: [], reviews: [], now });
    expect(o.leadsThisWeek).toBe(2);
    expect(o.leadsChange).toBe(1);
  });
  it("works the win rate on decided leads only, and is 0 with none decided", () => {
    expect(overview({ leads: [lead("a", DAY, "won"), lead("b", DAY, "lost"), lead("c", DAY, "new")], drives: [], reviews: [], now }).winRate).toBe(50);
    expect(overview({ leads: [lead("a", DAY)], drives: [], reviews: [], now }).winRate).toBe(0);
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
  it("averages ratings, and is 0 with no reviews", () => {
    expect(overview({ leads: [], drives: [], reviews: [review("a", 5), review("b", 4)], now }).averageRating).toBe(4.5);
    expect(overview({ leads: [], drives: [], reviews: [], now }).averageRating).toBe(0);
  });
});
