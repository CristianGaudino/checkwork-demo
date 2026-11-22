import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const lookup = vi.fn();
// The make directory covers every kind: BYD stands for a make with only new cars, none used.
const makes = [{ slug: "mercedes", label: "Mercedes" }, { slug: "mercedes-benz", label: "Mercedes-Benz" }, { slug: "kia", label: "Kia" }, { slug: "byd", label: "BYD" }];
vi.mock("@/lib/stock", () => ({ stock: { lookup: (slug: string) => lookup(slug) } }));
vi.mock("@/lib/stock/makes", () => ({ makeDirectory: async () => makes }));
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
  it("answers 404 with the make's gone page for a car link it no longer has, by the longest make the slug starts with", async () => {
    lookup.mockResolvedValue(null);
    const kia = await get("/used-cars/kia-soul-2019-9999999");
    expect(kia.status).toBe(404);
    expect(kia.headers.get("x-middleware-rewrite")).toContain("/gone/kia");
    expect((await get("/used-cars/mercedes-benz-c-class-2018-9")).headers.get("x-middleware-rewrite")).toMatch(/\/gone\/mercedes-benz$/);
  });
  it("answers 404 with the gone page for a removed new car of a make with no used stock", async () => {
    lookup.mockResolvedValue(null);
    const res = await get("/used-cars/byd-seal-2025-77");
    expect(res.status).toBe(404);
    expect(res.headers.get("x-middleware-rewrite")).toMatch(/\/gone\/byd$/);
  });
  it("lets a car of a make it never listed through to the plain 404", async () => {
    lookup.mockResolvedValue(null);
    expect((await get("/used-cars/zzz-model-3-2021-9")).headers.get("x-middleware-rewrite")).toBeNull();
  });
  it("lets a live car and a make page through, the make page without asking the stock", async () => {
    lookup.mockResolvedValueOnce({ state: "live" });
    expect((await get("/used-cars/audi-a4-2019-123")).headers.get("x-middleware-rewrite")).toBeNull();
    lookup.mockClear();
    expect((await get("/used-cars/audi")).headers.get("x-middleware-rewrite")).toBeNull();
    expect(lookup).not.toHaveBeenCalled();
  });
});
