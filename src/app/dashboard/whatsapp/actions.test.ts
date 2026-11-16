import { beforeEach, describe, expect, it, vi } from "vitest";

// Stop WhatsApp: the buyer's opt-in goes, and a lead erased meanwhile is never written back.
const db = vi.hoisted(() => ({ leads: new Map<string, Record<string, unknown>>(), log: [] as string[] }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("@/lib/modules", () => ({ requireModule: async () => {}, enabledModules: async () => new Set() }));
vi.mock("@/lib/permissions", () => ({ can: async () => true, currentMember: async () => ({ name: "Aoife" }) }));
vi.mock("@/lib/whatsapp/handle", () => ({ tap: async () => {}, typed: async () => {} }));
vi.mock("@/lib/whatsapp/store", () => ({ staffStore: {}, viewFor: async () => ({}) }));
vi.mock("@/lib/admin/activity", () => ({ logActivity: async (_a: string, text: string) => void db.log.push(text) }));
vi.mock("@/lib/admin/collections", () => ({
  getSettings: async () => ({ team: [] }),
  leadsStore: {
    get: async (id: string) => db.leads.get(id),
    update: async (id: string, fn: (l: Record<string, unknown>) => Record<string, unknown>) => {
      const cur = db.leads.get(id);
      if (!cur) return undefined;
      const next = fn(cur);
      db.leads.set(id, next);
      return next;
    },
  },
}));
const { stopWhatsAppAction } = await import("./actions");

beforeEach(() => {
  db.leads.clear();
  db.log.length = 0;
});

describe("Stop WhatsApp", () => {
  it("clears the buyer's opt-in and logs it without the buyer", async () => {
    db.leads.set("lead-1", { id: "lead-1", name: "Pat Byrne", whatsappOptIn: true });
    await stopWhatsAppAction("lead-1");
    expect(db.leads.get("lead-1")?.whatsappOptIn).toBeUndefined();
    expect(db.log).toEqual(["Stopped WhatsApp updates to the buyer"]);
  });

  it("never brings back a lead erased between the read and the write", async () => {
    db.leads.set("lead-1", { id: "lead-1", name: "Pat Byrne", whatsappOptIn: true });
    const update = (await import("@/lib/admin/collections")).leadsStore.update;
    const erased = vi.spyOn((await import("@/lib/admin/collections")).leadsStore, "update").mockImplementationOnce(async (id, fn) => {
      db.leads.delete(id); // the erasure lands first
      return update(id, fn);
    });
    await stopWhatsAppAction("lead-1");
    expect(db.leads.has("lead-1")).toBe(false);
    expect(db.log).toEqual([]);
    erased.mockRestore();
  });
});
