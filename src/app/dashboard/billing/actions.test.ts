import { beforeEach, describe, expect, it, vi } from "vitest";

// The AI model changes what the dealer pays: only the billing permission, a known model and the AI module switch it.
const s = vi.hoisted(() => ({ model: "opus", allowed: true, modules: new Set(["ai"]) }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/admin/activity", () => ({ logActivity: async () => {} }));
vi.mock("@/lib/permissions", () => ({ can: async () => s.allowed, currentMember: async () => ({ name: "Aoife" }) }));
vi.mock("@/lib/modules", () => ({ enabledModules: async () => s.modules }));
vi.mock("@/lib/billing/usage", () => ({
  billingSettings: async () => ({ aiModel: s.model }),
  saveBilling: async (c: { aiModel?: string }) => void (c.aiModel && (s.model = c.aiModel)),
  monthUsage: async () => ({}),
}));
const { saveAiModelAction } = await import("./actions");

beforeEach(() => Object.assign(s, { model: "opus", allowed: true, modules: new Set(["ai"]) }));

describe("saveAiModelAction", () => {
  it("switches the model for an owner or manager with AI on", async () => {
    await saveAiModelAction("sonnet");
    expect(s.model).toBe("sonnet");
  });
  it("leaves it alone without the billing permission, for an unknown model, or with AI off", async () => {
    s.allowed = false;
    await saveAiModelAction("sonnet");
    s.allowed = true;
    await saveAiModelAction("haiku" as never);
    s.modules = new Set();
    await saveAiModelAction("sonnet");
    expect(s.model).toBe("opus");
  });
});
