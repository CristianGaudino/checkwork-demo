import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => ({ get: () => "203.0.113.9" }), cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/leads/deps", () => ({ getDeps: () => ({}) }));
const processLead = vi.fn(async (fd: FormData) => (void fd, { status: "ok" as const }));
vi.mock("@/lib/leads/process", () => ({ processLead: (fd: FormData) => processLead(fd) }));
const { submitLead } = await import("./lead");

afterEach(() => processLead.mockClear());
const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe("the public lead action", () => {
  it("takes every kind of lead, with the WhatsApp opt-in as sent: the site has no modules", async () => {
    for (const type of ["enquiry", "finance", "trade_in", "test_drive", "sourcing", "alert"]) expect(await submitLead(form({ type, whatsappOptIn: "yes" }))).toEqual({ status: "ok" });
    expect(processLead).toHaveBeenCalledTimes(6);
    expect(processLead.mock.calls[0][0].get("whatsappOptIn")).toBe("yes");
  });
});
