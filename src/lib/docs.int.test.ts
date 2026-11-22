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

  it("keeps put records, replaces one with the same id, and keeps collections apart", async () => {
    const c = defineCollection<Item>("i-basic");
    await c.put({ id: "a", n: 1 });
    await c.put({ id: "b", n: 2 });
    await c.put({ id: "a", n: 9 });
    expect((await c.list()).map((d) => d.n).sort()).toEqual([2, 9]);
    expect(await c.get("a")).toEqual({ id: "a", n: 9 });
    expect(await defineCollection<Item>("i-other").get("a")).toBeUndefined();
  });

  it("reset empties only its own collection", async () => {
    const x = defineCollection<Item>("i-x");
    const y = defineCollection<Item>("i-y");
    await x.put({ id: "a", n: 1 });
    await y.put({ id: "a", n: 2 });
    await x.reset();
    expect(await x.list()).toEqual([]);
    expect(await y.list()).toEqual([{ id: "a", n: 2 }]);
  });

  it("a failed query is rethrown with the collection's name, never the record's values", async () => {
    const c = defineCollection<Item & { email?: string }>("i-quiet");
    const err = await c.put({ id: null as unknown as string, n: 1, email: "pat@example.com" }).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect(String((err as Error).message)).toBe("admin_docs i-quiet put failed");
    expect(JSON.stringify(err)).not.toContain("pat@example.com");
    expect((err as Error).cause).toBeUndefined();
  });
});
