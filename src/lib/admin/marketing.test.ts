import { describe, expect, it } from "vitest";
import type { Car } from "@/lib/stock/types";
import { calendarWeek, weekDays, worthPosting, writeNewsletter, writePost } from "./marketing";

const voice = { voice: "Plain.", hashtags: "#usedcars", signOff: "Call in to see it." };
const car = { id: "1", slug: "ford-focus-2019-1", make: "Ford", model: "Focus", variant: "1.0 Titanium", year: 2019, priceEur: 13950, mileageKm: 129999, fuel: "petrol", gearbox: "manual", photos: [] } as unknown as Car;

describe("writePost", () => {
  it("uses only the car's own facts and price", () => {
    const t = writePost(car, "Facebook", voice);
    expect(t).toContain("Just in: 2019 Ford Focus 1.0 Titanium.");
    expect(t).toContain("129,999 km, Petrol, Manual");
    expect(t).toContain("€13,950");
    expect(t).toContain("/used-cars/ford-focus-2019-1");
    expect(t).not.toContain("#usedcars");
  });
  it("says the VAT status when the car has one", () => {
    expect(writePost({ ...car, vat: "ex" }, "Facebook", voice)).toContain("€13,950 Ex. VAT, reclaimable");
  });
  it("puts a link in the bio and the hashtags on Instagram, and keeps TikTok short", () => {
    const ig = writePost(car, "Instagram", voice);
    expect(ig).toContain("Link in bio.");
    expect(ig.endsWith("#usedcars")).toBe(true);
    const tt = writePost(car, "TikTok", voice);
    expect(tt).not.toContain("Call in to see it.");
    expect(tt.endsWith("#usedcars")).toBe(true);
  });
  it("gives the same text for the same input", () => {
    expect(writePost(car, "Facebook", voice)).toBe(writePost(car, "Facebook", voice));
  });
});

describe("writeNewsletter", () => {
  it("lists each car with its price and link, then the sign-off", () => {
    const n = writeNewsletter([car], voice);
    expect(n.subject).toBe("New arrivals at Checkwork Motors");
    expect(n.body).toContain("- 2019 Ford Focus, €13,950.");
    expect(n.body.endsWith("Call in to see it.")).toBe(true);
  });
  it("still makes sense with no cars", () => {
    const n = writeNewsletter([], voice);
    expect(n.subject).toBe("News from Checkwork Motors");
    expect(n.body).toBe("Call in to see it.");
  });
});

import { simulatedAd, simulatedLetter, simulatedPost } from "./marketing";
describe("simulated figures", () => {
  it("are the same for the same record, and sensible", () => {
    expect(simulatedPost("post-1")).toEqual(simulatedPost("post-1"));
    const a = simulatedAd("ad-1");
    expect(a.clicks).toBeLessThan(a.impressions);
    const n = simulatedLetter("nl-1", 100);
    expect(n.recipients).toBe(100);
    expect(n.opens).toBeLessThanOrEqual(100);
    expect(n.clicks).toBeLessThan(n.opens);
  });
});

describe("worthPosting", () => {
  const now = Date.parse("2026-11-11T12:00:00Z");
  const c = (slug: string, o: Partial<Car>) => ({ ...car, id: slug, slug, ...o }) as Car;
  it("suggests new cars first, then reduced ones, never one posted lately or sold, at most three", () => {
    const cars = [
      c("old-plain", { listedAt: "2026-09-01" }),
      c("reduced", { listedAt: "2026-09-01", priceEur: 9000, wasPriceEur: 9500 }),
      c("new-a", { listedAt: "2026-11-05" }),
      c("new-b", { listedAt: "2026-11-10" }),
      c("new-posted", { listedAt: "2026-11-10" }),
      c("new-sold", { listedAt: "2026-11-10", soldAt: "2026-11-11" }),
    ];
    const ideas = worthPosting(cars, [{ carSlug: "new-posted", createdAt: now - 3_600_000 }], now);
    expect(ideas.map((i) => [i.car.slug, i.reason])).toEqual([["new-b", "New this week"], ["new-a", "New this week"], ["reduced", "Price dropped"]]);
    expect(worthPosting([...cars, c("new-c", { listedAt: "2026-11-09" })], [], now)).toHaveLength(3);
  });
});

describe("the calendar week", () => {
  it("runs Monday to Sunday around any day", () => {
    expect(weekDays("2026-11-18")).toEqual(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"]);
    expect(weekDays("2026-11-22")[0]).toBe("2026-11-16"); // a Sunday belongs to the week before it
    expect(weekDays("2026-11-16")[6]).toBe("2026-11-22");
  });
  it("puts scheduled and posted posts and started ads on their day, and leaves drafts off", () => {
    const days = weekDays("2026-11-18");
    const at = (d: string, h = 10) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00Z`);
    const base = { network: "Facebook" as const, text: "t", createdAt: 0 };
    const posts = [
      { ...base, id: "a", status: "scheduled" as const, scheduledFor: at("2026-11-19"), format: "story" as const },
      { ...base, id: "b", status: "posted" as const, postedAt: at("2026-11-19", 8) },
      { ...base, id: "c", status: "draft" as const },
      { ...base, id: "d", status: "scheduled" as const, scheduledFor: at("2026-12-25") },
    ];
    const ads = [{ id: "x", platform: "Meta" as const, name: "n", carTitle: "Car", budgetEur: 100, status: "running" as const, impressions: 0, clicks: 0, leads: 0, createdAt: at("2026-11-17") }];
    const week = calendarWeek(posts, ads, days);
    expect(week["2026-11-19"].map((i) => i.id)).toEqual(["b", "a"]); // by time of day
    expect(week["2026-11-19"][1].title).toBe("Facebook story");
    expect(week["2026-11-17"].map((i) => i.id)).toEqual(["x"]);
    expect(Object.values(week).flat()).toHaveLength(3);
  });
});
