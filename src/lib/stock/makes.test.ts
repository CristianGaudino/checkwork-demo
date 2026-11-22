import { describe, expect, it } from "vitest";
import { POPULAR_MAKES } from "@/lib/leads/makes";
import { everyKindOrNull } from "./index";
import { carsOfMake, findMake, makeDirectory } from "./makes";
import { carChoices } from "./options";
import { forSale, isSold } from "./types";

describe("the make directory", () => {
  it("lists the makes in stock first (most cars first), then the popular ones, each once, with counts by kind", async () => {
    const dir = await makeDirectory(true);
    const slugs = dir.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const stocked = dir.filter((m) => m.count > 0);
    expect(dir.slice(0, stocked.length)).toEqual(stocked); // in stock come first
    for (let i = 1; i < stocked.length; i++) expect(stocked[i - 1].count).toBeGreaterThanOrEqual(stocked[i].count);
    for (const m of stocked) expect(m.byKind.used + m.byKind.new + m.byKind.commercial).toBe(m.count);
    for (const label of POPULAR_MAKES) expect(dir.some((m) => m.label === label)).toBe(true);
  });
  it("without every known make, only the makes in stock", async () => {
    expect((await makeDirectory()).every((m) => m.count > 0)).toBe(true);
  });
  it("with every known make, still each once, and finds one with no cars", async () => {
    const all = await makeDirectory(true);
    expect(all.length).toBeGreaterThan((await makeDirectory()).length);
    expect(new Set(all.map((m) => m.slug)).size).toBe(all.length);
    const empty = all.find((m) => m.count === 0)!;
    expect(await findMake(empty.slug)).toMatchObject({ slug: empty.slug, count: 0 });
    expect(await findMake("no-such-make")).toBeNull();
  });
  it("a make's cars are its unsold ones, newest first", async () => {
    const [top] = await makeDirectory();
    const cars = await carsOfMake(top.slug);
    expect(cars).toHaveLength(top.count);
    expect(cars.every((c) => c.makeSlug === top.slug && !isSold(c))).toBe(true);
    expect(cars.map((c) => Number(c.id))).toEqual([...cars.map((c) => Number(c.id))].sort((a, b) => b - a));
  });
});

describe("the cars a form offers", () => {
  it("are every car for sale (not sold, not reserved), newest first, named with the variant", async () => {
    const choices = await carChoices();
    const cars = ((await everyKindOrNull()) ?? []).filter(forSale);
    expect(choices).toHaveLength(cars.length);
    const ids = choices.map(([id]) => Number(id));
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
    const withVariant = cars.find((c) => c.variant)!;
    expect(choices.find(([id]) => id === withVariant.id)![1]).toContain(withVariant.variant);
  });
});
