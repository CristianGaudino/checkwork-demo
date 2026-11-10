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

  it("reset brings the seed back, and collections stay apart", async () => {
    const x = defineCollection<Item>("i-x", () => [{ id: "s", n: 1 }]);
    const y = defineCollection<Item>("i-y", () => []);
    await x.put({ id: "extra", n: 5 });
    expect(await y.get("extra")).toBeUndefined();
    await x.reset();
    expect(await x.list()).toEqual([{ id: "s", n: 1 }]);
  });
});
