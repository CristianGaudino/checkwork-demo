import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const team = vi.hoisted(() => ({ list: [] as { id: string; name: string; email: string; role: string }[] }));
vi.mock("@/lib/admin/collections", () => ({
  getSettings: async () => ({ team: team.list, billing: { caps: { lookup: 1 }, ceilings: {}, alerts: [], alertAt80: true, aiPlan: "perAction" } }),
  settingsStore: { put: async () => {} },
}));
const notices = vi.hoisted(() => [] as { for?: string }[]);
vi.mock("@/lib/admin/notifications", () => ({ notify: async (n: { for?: string }) => void notices.push(n) }));
vi.mock("@/lib/modules", () => ({ hasModule: async () => true }));
vi.mock("./rules", async (real) => ({ ...(await real<typeof import("./rules")>()), SHOW_PRICING: true })); // the notices as they work with pricing shown
const { recordUsage, usageStore, sentAlertsStore } = await import("./usage");

beforeEach(async () => {
  vi.stubEnv("DEMO_RECORDS", "off"); // an empty month, not the demo's seeded one
  notices.length = 0;
  await usageStore.reset();
  await sentAlertsStore.reset();
});
afterEach(() => vi.unstubAllEnvs());

describe("who hears that a limit is reached", () => {
  it("each owner and manager by name, and an owner known only by ADMIN_OWNER_EMAILS by their email; never Sales", async () => {
    team.list = [
      { id: "1", name: "Ciara Walsh", email: "ciara@example.com", role: "Manager" },
      { id: "2", name: "Conor Doyle", email: "conor@example.com", role: "Sales" },
    ];
    vi.stubEnv("ADMIN_OWNER_EMAILS", "Owner@Example.com, ciara@example.com");
    await recordUsage("lookup", "website", 4); // €1.20, past the €1 limit
    expect([...new Set(notices.map((n) => n.for))].sort()).toEqual(["Ciara Walsh", "owner@example.com"]);
  });

  it("nobody at all when there is no owner or manager, rather than everyone", async () => {
    team.list = [{ id: "2", name: "Conor Doyle", email: "conor@example.com", role: "Sales" }];
    await recordUsage("lookup", "website", 4);
    expect(notices).toEqual([]);
  });
});

describe("our ceilings on a record saved before they existed", () => {
  it("still apply: a stored empty ceilings never drops the AI ceiling", async () => {
    const { billingSettings } = await import("./usage");
    const { AI_CEILING_EUR } = await import("./rules");
    expect((await billingSettings()).ceilings.ai).toBe(AI_CEILING_EUR);
  });
});
