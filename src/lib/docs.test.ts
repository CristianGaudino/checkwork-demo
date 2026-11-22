import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { defineCollection } = await import("./docs");

type Item = { id: string; n: number };

describe("defineCollection (memory, no D1 binding)", () => {
  it("keeps what is put, replaces a record with the same id, and keeps collections apart", async () => {
    const c = defineCollection<Item>("t-basic");
    expect(await c.list()).toEqual([]);
    await c.put({ id: "b", n: 2 });
    await c.put({ id: "a", n: 1 });
    await c.put({ id: "a", n: 9 });
    expect((await c.list()).map((d) => d.n).sort()).toEqual([2, 9]);
    expect(await c.get("a")).toEqual({ id: "a", n: 9 });
    expect(await defineCollection<Item>("t-other").get("a")).toBeUndefined();
  });

  it("reset empties the collection", async () => {
    const c = defineCollection<Item>("t-reset");
    await c.put({ id: "a", n: 1 });
    await c.reset();
    expect(await c.list()).toEqual([]);
  });
});
