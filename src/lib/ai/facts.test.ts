import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => ({ get: () => null }) }));
const { buildFacts } = await import("./facts");
const { leadsStore } = await import("@/lib/admin/collections");

describe("buildFacts for a lead reply", () => {
  it("gives the car's own details and whether it is still for sale, so the reply can answer", async () => {
    const lead = (await leadsStore.list()).find((l) => l.carSlug)!;
    const built = await buildFacts({ task: "leadReply", leadId: lead.id }, "D");
    expect(built?.task).toBe("leadReply");
    const f = built!.facts as { carDetails?: { name: string; forSale: boolean; link?: string } };
    expect(f.carDetails).toMatchObject({ name: expect.any(String), forSale: expect.any(Boolean), link: expect.stringContaining(lead.carSlug!) });
    expect(JSON.stringify(f)).not.toContain(lead.email); // the customer's contacts still never go in
  });
});
