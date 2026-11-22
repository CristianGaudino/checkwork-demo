import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const lookup = vi.fn();
vi.mock("@/lib/stock", () => ({ stock: { lookup: (slug: string) => lookup(slug) } }));
const { proxy, config } = await import("./proxy");
const get = (path: string) => proxy(new NextRequest(`https://demo.example${path}`));

describe("the proxy", () => {
  it("only runs on the car pages", () => {
    expect(config.matcher).toEqual(["/used-cars/:slug"]);
  });
  it("answers 410 with the make's gone page for a car that has been sold and has expired", async () => {
    lookup.mockResolvedValueOnce({ state: "gone", makeSlug: "audi" });
    const res = await get("/used-cars/audi-a4-2019-123");
    expect(res.status).toBe(410);
    expect(res.headers.get("x-middleware-rewrite")).toContain("/gone/audi");
  });
  it("lets a live car, an unknown car and a make page through without asking the stock", async () => {
    lookup.mockResolvedValueOnce({ state: "live" });
    expect((await get("/used-cars/audi-a4-2019-123")).headers.get("x-middleware-rewrite")).toBeNull();
    lookup.mockClear();
    expect((await get("/used-cars/audi")).headers.get("x-middleware-rewrite")).toBeNull();
    expect(lookup).not.toHaveBeenCalled();
  });
});
