import { beforeEach, describe, expect, it, vi } from "vitest";
import { truncate } from "@/test/sqlite-db";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => import("@/test/sqlite-db"));
vi.mock("@/lib/leads/bindings", () => ({ getBindings: () => ({ DB: {} }) }));
const { defineCollection } = await import("./docs");

type Item = { id: string; n: number };

// The same behaviour as the memory test, against a real SQLite with the committed migrations (the D1 path).
describe("defineCollection (D1 path, on SQLite)", () => {
  beforeEach(() => truncate("admin_docs"));

  it("seeds on first read, keeps put and remove, and does not reseed", async () => {
    const seed = vi.fn(() => [{ id: "a", n: 1 }, { id: "b", n: 2 }]);
    const c = defineCollection<Item>("i-basic", seed);
    expect((await c.list()).map((d) => d.id).sort()).toEqual(["a", "b"]);
    await c.put({ id: "a", n: 9 });
    await c.remove("b");
    expect(await c.list()).toEqual([{ id: "a", n: 9 }]);
    await c.remove("a");
    expect(await c.list()).toEqual([]);
    expect(seed).toHaveBeenCalledTimes(1);
  });

  it("after a reset in one isolate, another that already knew the collection still lists the seed", async () => {
    const seed = () => [{ id: "s", n: 1 }];
    const here = defineCollection<Item>("i-iso", seed);
    expect(await here.list()).toHaveLength(1);
    vi.resetModules(); // a second Worker isolate: its own memory of what is seeded
    const there = (await import("./docs")).defineCollection<Item>("i-iso", seed);
    expect(await there.list()).toHaveLength(1); // it now remembers the collection as seeded
    await here.reset();
    expect(await there.list()).toEqual([{ id: "s", n: 1 }]);
  });

  it("a failed query is rethrown with the collection's name, never the record's values", async () => {
    const c = defineCollection<Item & { email?: string }>("i-quiet", () => []);
    const err = await c.put({ id: null as unknown as string, n: 1, email: "pat@example.com" }).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect(String((err as Error).message)).toBe("admin_docs i-quiet put failed");
    expect(JSON.stringify(err)).not.toContain("pat@example.com");
    expect((err as Error).cause).toBeUndefined();
  });

  it("update applies the change to the record as it is now, and a write in between makes it read again, not overwrite", async () => {
    const c = defineCollection<Item & { notes: string[] }>("i-update", () => [{ id: "a", n: 1, notes: [] }]);
    let calls = 0;
    const out = await c.update("a", async (d) => {
      if (++calls === 1) await c.put({ ...d, notes: ["written meanwhile"] }); // another request writes between the read and the write
      return { ...d, n: 2 };
    });
    expect(calls).toBe(2);
    expect(out).toEqual({ id: "a", n: 2, notes: ["written meanwhile"] });
    expect(await c.get("a")).toEqual({ id: "a", n: 2, notes: ["written meanwhile"] });
    // Two quick updates in a row both land.
    await c.update("a", (d) => ({ ...d, notes: [...d.notes, "x"] }));
    await c.update("a", (d) => ({ ...d, notes: [...d.notes, "y"] }));
    expect((await c.get("a"))!.notes).toEqual(["written meanwhile", "x", "y"]);
  });

  it("update never brings back a record that is gone, and gives up after one retry", async () => {
    const c = defineCollection<Item>("i-gone", () => [{ id: "a", n: 1 }]);
    expect(await c.update("missing", (d) => d)).toBeUndefined();
    const out = await c.update("a", async (d) => {
      await c.remove("a"); // erased between the read and the write
      return { ...d, n: 2 };
    });
    expect(out).toBeUndefined();
    expect(await c.get("a")).toBeUndefined();
    await c.put({ id: "b", n: 1 });
    const err = await c.update("b", async (d) => (await c.put({ ...d }), { ...d, n: 3 })).catch((e: Error) => e);
    expect(String(err)).toContain("admin_docs i-gone update clashed");
  });

  it("reset brings the seed back, and collections stay apart", async () => {
    const x = defineCollection<Item>("i-x", () => [{ id: "s", n: 1 }]);
    const y = defineCollection<Item>("i-y", () => []);
    await x.put({ id: "extra", n: 5 });
    expect(await y.get("extra")).toBeUndefined();
    await x.reset();
    expect(await x.list()).toEqual([{ id: "s", n: 1 }]);
  });

  it("reset keeps what visitors sent (real- ids) and a peek never seeds", async () => {
    const x = defineCollection<Item>("i-real", () => [{ id: "s", n: 1 }]);
    expect(await x.list({ seed: false })).toEqual([]); // not seeded, and the peek wrote nothing
    await x.put({ id: "real-1", n: 7 });
    await x.put({ id: "extra", n: 5 });
    await x.reset();
    expect((await x.list()).map((d) => d.id).sort()).toEqual(["real-1", "s"]);
    expect((await x.list({ seed: false })).length).toBe(2);
  });
});
