import { describe, expect, it } from "vitest";
import { RANGES, buildAnalytics, change, parseRange, share } from "./analytics";

const cars = Array.from({ length: 20 }, (_, i) => ({ slug: `car-${i}`, title: `Car ${i}` }));
const now = new Date("2026-11-10T15:00:00Z").getTime();
const total = (xs: { visitors: number }[]) => xs.reduce((s, x) => s + x.visitors, 0);

describe("share", () => {
  it("adds up exactly, whatever the weights", () => {
    for (const [t, w] of [[100, [1, 1, 1]], [7, [3, 3, 3, 1]], [0, [1, 2]], [1234, [42, 22, 15, 9, 8, 4]]] as const) expect(share(t, w).reduce((a, b) => a + b, 0)).toBe(t);
  });
});

describe("buildAnalytics", () => {
  it("gives the same figures for the same range and day", () => {
    expect(buildAnalytics({ range: 30, cars, now })).toEqual(buildAnalytics({ range: 30, cars, now }));
  });
  it("covers each range with that many days, oldest first", () => {
    for (const range of RANGES) {
      const a = buildAnalytics({ range, cars, now });
      expect(a.days).toHaveLength(range);
      expect(a.days.at(-1)!.date).toBe("2026-11-10");
      expect(a.days[0].date < a.days[1].date).toBe(true);
    }
  });
  it("agrees with itself: days, sources, places and devices all add up to the visitors", () => {
    const a = buildAnalytics({ range: 30, cars, now });
    expect(total(a.days)).toBe(a.totals.visitors);
    expect(total(a.sources)).toBe(a.totals.visitors);
    expect(total(a.places)).toBe(a.totals.visitors);
    expect(total(a.devices)).toBe(a.totals.visitors);
    expect(a.sources.reduce((s, x) => s + x.leads, 0)).toBe(a.totals.leads);
  });
  it("never grows going down the funnel, and the top step is the visitors", () => {
    for (const range of RANGES) {
      const f = buildAnalytics({ range, cars, now }).funnel;
      expect(f[0].count).toBe(buildAnalytics({ range, cars, now }).totals.visitors);
      f.slice(1).forEach((s, i) => expect(s.count).toBeLessThanOrEqual(f[i].count));
    }
  });
  it("lists the most viewed cars first, at most eight, and copes with no cars", () => {
    const a = buildAnalytics({ range: 30, cars, now });
    expect(a.topCars).toHaveLength(8);
    a.topCars.slice(1).forEach((c, i) => expect(c.views).toBeLessThanOrEqual(a.topCars[i].views));
    expect(buildAnalytics({ range: 7, cars: [], now }).topCars).toEqual([]);
  });
});

describe("real lead times", () => {
  it("make the lead totals match the inbox, and the sources and funnel follow", () => {
    const day = 86_400_000;
    const times = [now - 1000, now - 2000, now - 3 * day, now - 40 * day]; // two today, one three days ago, one outside 30 days
    const a = buildAnalytics({ range: 30, cars, now, leadTimes: times });
    expect(a.totals.leads).toBe(3);
    expect(a.sources.reduce((s, x) => s + x.leads, 0)).toBe(3);
    expect(a.funnel[3].count).toBeLessThanOrEqual(3);
    expect(buildAnalytics({ range: 7, cars, now, leadTimes: times }).totals.leads).toBe(3);
    expect(buildAnalytics({ range: 30, cars, now, leadTimes: [] }).totals.leads).toBe(0);
  });
});

describe("range and change", () => {
  it("accepts only known ranges", () => {
    expect(parseRange("90")).toBe(90);
    expect(parseRange("12")).toBe(30);
    expect(parseRange(undefined)).toBe(30);
  });
  it("works the change against the earlier figure, and is 0 when there is none", () => {
    expect(change(120, 100)).toBe(20);
    expect(change(80, 100)).toBe(-20);
    expect(change(5, 0)).toBe(0);
  });
});
