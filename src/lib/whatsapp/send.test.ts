import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const usage = vi.hoisted(() => ({ allowed: true, recorded: [] as string[] }));
vi.mock("@/lib/billing/usage", () => ({ usageAllowed: async () => usage.allowed, recordUsage: async (_s: string, k: string) => void usage.recorded.push(k) }));
const stored = vi.hoisted(() => [] as Record<string, unknown>[]);
vi.mock("./store", () => ({ addMessage: async (m: Record<string, unknown>) => (stored.push(m), m) }));
const { sendWhatsApp } = await import("./send");

const draft = { thread: "buyer", from: "site", text: "Hi" } as const;
beforeEach(() => {
  usage.allowed = true;
  usage.recorded = [];
  stored.length = 0;
});

describe("sendWhatsApp", () => {
  it("sends on the demo and counts it", async () => {
    const m = await sendWhatsApp(draft, "reply");
    expect(m?.via).toBeUndefined();
    expect(usage.recorded).toEqual(["reply"]);
  });
  it("past the cap goes by email and is not counted as WhatsApp", async () => {
    usage.allowed = false;
    expect((await sendWhatsApp(draft, "alert"))?.via).toBe("email");
    expect(usage.recorded).toEqual([]);
  });
  it("past the cap a marketing message is not sent at all", async () => {
    usage.allowed = false;
    expect(await sendWhatsApp(draft, "marketing")).toBeNull();
    expect(stored).toEqual([]);
  });
  it("a buyer who chose email gets email, uncounted", async () => {
    expect((await sendWhatsApp(draft, "reply", { email: true }))?.via).toBe("email");
    expect(usage.recorded).toEqual([]);
  });

  it("sends nothing, rather than an email nobody gets, when there is no address to fall back to", async () => {
    usage.allowed = false;
    expect(await sendWhatsApp({ thread: "buyer", from: "site", text: "Hi" }, "reply", { canEmail: false })).toBeNull();
    expect(stored).toEqual([]);
  });
});
