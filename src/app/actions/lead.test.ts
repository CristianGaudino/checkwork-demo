import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => ({ get: () => "203.0.113.9" }), cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/leads/deps", () => ({ getDeps: () => ({}) }));
const processLead = vi.fn(async (fd: FormData) => (void fd, { status: "ok" as const }));
vi.mock("@/lib/leads/process", () => ({ processLead: (fd: FormData) => processLead(fd) }));
const { submitLead } = await import("./lead");

afterEach(() => {
  vi.unstubAllEnvs();
  processLead.mockClear();
});
const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe("the public lead action and the dealer's modules (#173)", () => {
  it("refuses each kind of lead whose module the dealer does not have, before anything is stored", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_MODULES", "dashboard");
    for (const type of ["finance", "trade_in", "test_drive", "sourcing", "order", "alert"]) expect(await submitLead(form({ type }))).toEqual({ status: "failed", kind: "server" });
    expect(processLead).not.toHaveBeenCalled();
  });

  it("takes an enquiry on the base site, without the WhatsApp opt-in when the dealer has no WhatsApp", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_MODULES", "");
    expect(await submitLead(form({ type: "enquiry", whatsappOptIn: "yes" }))).toEqual({ status: "ok" });
    expect(processLead.mock.calls[0][0].get("whatsappOptIn")).toBeNull();
  });

  it("keeps the opt-in with WhatsApp", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_MODULES", "dashboard,whatsapp,finance");
    await submitLead(form({ type: "finance", whatsappOptIn: "yes" }));
    expect(processLead.mock.calls[0][0].get("whatsappOptIn")).toBe("yes");
  });
});
