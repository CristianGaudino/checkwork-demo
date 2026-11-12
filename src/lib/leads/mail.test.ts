import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const sent: string[] = [];
vi.mock("./bindings", () => ({ getBindings: () => ({ EMAIL: { send: async (m: { to: string }) => void sent.push(m.to) } }) }));
vi.mock("@/lib/admin/collections", () => ({ getSettings: async () => ({ leadEmails: [] }) }));
const { sendTo } = await import("./mail");

afterEach(() => {
  sent.length = 0;
  vi.unstubAllEnvs();
});

describe("sendTo", () => {
  it("sends the made-up team's mail (example.com) to the lead inbox, once, and real addresses as given", async () => {
    vi.stubEnv("LEAD_TO_EMAIL", "dealer@checkwork.test");
    await sendTo(["aoife@example.com", "ciara@example.com", "boss@checkwork.test"], { subject: "s", text: "t" });
    expect(sent).toEqual(["dealer@checkwork.test", "boss@checkwork.test"]);
  });
  it("fails when a made-up address has no inbox to go to", async () => {
    await expect(sendTo(["conor@example.com"], { subject: "s", text: "t" })).rejects.toThrow("No one to send to");
  });
});
