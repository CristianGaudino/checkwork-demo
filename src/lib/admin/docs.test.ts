import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { defineCollection } = await import("./docs");

type Item = { id: string; n: number };

describe("defineCollection (memory, no D1 binding)", () => {
  it("starts from its seed, and keeps put and remove", async () => {
    const c = defineCollection<Item>("t-basic", () => [{ id: "a", n: 1 }]);
    expect(await c.list()).toEqual([{ id: "a", n: 1 }]);
    await c.put({ id: "b", n: 2 });
    await c.put({ id: "a", n: 9 });
    expect((await c.list()).map((d) => d.n).sort()).toEqual([2, 9]);
    expect(await c.get("a")).toEqual({ id: "a", n: 9 });
    await c.remove("a");
    expect(await c.get("a")).toBeUndefined();
  });

  it("seeds once: emptying the collection does not bring the seed back, reset does", async () => {
    const seed = vi.fn(() => [{ id: "a", n: 1 }]);
    const c = defineCollection<Item>("t-seed", seed);
    await c.remove("a");
    expect(await c.list()).toEqual([]);
    expect(seed).toHaveBeenCalledTimes(1);
    await c.reset();
    expect(await c.list()).toEqual([{ id: "a", n: 1 }]);
  });

  it("keeps collections apart", async () => {
    const x = defineCollection<Item>("t-x", () => []);
    const y = defineCollection<Item>("t-y", () => []);
    await x.put({ id: "same", n: 1 });
    expect(await y.get("same")).toBeUndefined();
  });
});
