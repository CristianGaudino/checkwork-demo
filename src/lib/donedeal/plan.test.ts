import { describe, expect, it } from "vitest";
import type { Car } from "@/lib/stock/types";
import { planSync } from "./plan";

const car = (id: string, o: Partial<Car> = {}): Car => ({ id, make: "Ford", model: "Focus", year: 2018, priceEur: 10000, slug: `ford-focus-${id}`, makeSlug: "ford", modelSlug: "focus", photos: [], listedAt: "2026-10-01", ...o }) as Car;
const TODAY = "2026-11-11";

describe("planSync", () => {
  it("changes nothing when DoneDeal has what we have", () => {
    const stock = [car("1"), car("2"), car("3", { soldAt: "2026-10-20" })];
    expect(planSync(stock, [car("1"), car("2")], TODAY)).toEqual({ added: [], changed: [], gone: [] });
  });

  it("adds a new listing, dated today unless DoneDeal dates it", () => {
    const p = planSync([car("1")], [car("1"), car("2", { listedAt: undefined }), car("3", { listedAt: "2026-11-09" })], TODAY);
    expect(p.added.map((c) => [c.id, c.listedAt])).toEqual([["2", TODAY], ["3", "2026-11-09"]]);
  });

  it("updates a changed car and keeps the site's own listing date", () => {
    const p = planSync([car("1")], [car("1", { priceEur: 9500, listedAt: undefined })], TODAY);
    expect(p.changed).toHaveLength(1);
    expect(p.changed[0].after).toMatchObject({ priceEur: 9500, listedAt: "2026-10-01" });
    expect(p.changed[0].before.priceEur).toBe(10000);
  });

  it("puts a sold car back on sale when DoneDeal lists it again", () => {
    const p = planSync([car("1", { soldAt: "2026-11-01" })], [car("1")], TODAY);
    expect(p.changed[0].after.soldAt).toBeUndefined();
  });

  it("marks a car sold when DoneDeal stops listing it", () => {
    const p = planSync([car("1"), car("2"), car("3"), car("4")], [car("1"), car("2"), car("3")], TODAY);
    expect(p.gone.map((c) => [c.id, c.soldAt])).toEqual([["4", TODAY]]);
  });

  it("holds, changing nothing, when DoneDeal's answer looks broken", () => {
    const stock = ["1", "2", "3", "4", "5", "6"].map((id) => car(id));
    expect(planSync(stock, [], TODAY).held).toMatch(/sent no cars/);
    const half = planSync(stock, [car("1"), car("2")], TODAY);
    expect(half).toMatchObject({ added: [], changed: [], gone: [] });
    expect(half.held).toMatch(/no longer lists 4 of the 6/);
    // A small dealer selling two of three is real, not broken: fewer than three gone never holds.
    expect(planSync([car("1"), car("2"), car("3")], [car("1")], TODAY).held).toBeUndefined();
    // The dealer can apply it anyway.
    expect(planSync(stock, [], TODAY, { force: true }).gone).toHaveLength(6);
  });

  it("an empty site takes whatever DoneDeal has", () => {
    expect(planSync([], [], TODAY)).toEqual({ added: [], changed: [], gone: [] });
    expect(planSync([], [car("1")], TODAY).added).toHaveLength(1);
  });
});
