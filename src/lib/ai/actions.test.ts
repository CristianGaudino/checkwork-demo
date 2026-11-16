import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => ({ get: () => null }) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not-found"); } }));
const { writeAction } = await import("./actions");
const { saveBilling, monthCounts } = await import("@/lib/billing/usage");
const { adminCars } = await import("@/lib/admin/stock-admin");
const { forSale } = await import("@/lib/stock/types");
const { reviewsStore } = await import("@/lib/admin/collections");

const count = async (kind: string) => (await monthCounts()).find((c) => c.service === "ai" && c.kind === kind)?.count ?? 0;

describe("writeWithAI behind the dashboard", () => {
  afterEach(async () => {
    await saveBilling({ caps: {}, aiModel: "opus" });
    delete process.env.NEXT_PUBLIC_SITE_MODULES;
  });

  it("writes a post from the car, counted under the dealer's model, and an adjust the same way", async () => {
    const car = (await adminCars()).find(forSale)!;
    const req = { task: "post", carSlug: car.slug, network: "Facebook", format: "post" } as const;
    const opus = await count("opus");
    const first = await writeAction(req);
    expect(first).toMatchObject({ ok: true });
    expect(await count("opus")).toBe(opus + 1);
    await saveBilling({ aiModel: "sonnet" });
    const sonnet = await count("sonnet");
    const shorter = await writeAction(req, "shorter", first.ok ? first.text : "");
    expect(shorter).toMatchObject({ ok: true });
    expect(first.ok && shorter.ok && shorter.text.length < first.text.length).toBe(true);
    expect(await count("sonnet")).toBe(sonnet + 1);
    expect(await count("opus")).toBe(opus + 1);
  }, 10_000);

  it("says the limit is reached past the cap, writes nothing and counts nothing", async () => {
    await saveBilling({ caps: { ai: 0 } });
    const before = await count("opus");
    expect(await writeAction({ task: "reviewReply", reviewId: (await reviewsStore.list())[0].id })).toEqual({ ok: false, reason: "limit" });
    expect(await count("opus")).toBe(before);
  });

  it("fails quietly, uncounted, for a record that is not there or a request that is not valid", async () => {
    const before = await count("opus");
    expect(await writeAction({ task: "leadReply", leadId: "no-such-lead" })).toEqual({ ok: false, reason: "failed" });
    expect(await writeAction({ task: "post", carSlug: "x", network: "Nowhere", format: "post" } as never)).toEqual({ ok: false, reason: "failed" });
    expect(await writeAction({ task: "newsletter" }, "nonsense" as never)).toEqual({ ok: false, reason: "failed" });
    expect(await count("opus")).toBe(before);
  });

  it("does not exist for a dealer without the AI module", async () => {
    process.env.NEXT_PUBLIC_SITE_MODULES = "dashboard";
    await expect(writeAction({ task: "newsletter" })).rejects.toThrow("not-found");
  });
});
