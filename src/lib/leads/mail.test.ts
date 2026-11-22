import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const sent: string[] = [];
vi.mock("./bindings", () => ({ getBindings: () => ({ EMAIL: { send: async (m: { to: string }) => void sent.push(m.to) } }) }));
const { sendToDealer } = await import("./mail");

afterEach(() => {
  sent.length = 0;
  vi.unstubAllEnvs();
});

describe("sendToDealer", () => {
  it("sends to the LEAD_TO_EMAIL address", async () => {
    vi.stubEnv("LEAD_TO_EMAIL", "dealer@checkwork.test");
    await sendToDealer({ subject: "s", text: "t" });
    expect(sent).toEqual(["dealer@checkwork.test"]);
  });
  it("fails when no address is set", async () => {
    vi.stubEnv("LEAD_TO_EMAIL", "");
    await expect(sendToDealer({ subject: "s", text: "t" })).rejects.toThrow();
    expect(sent).toEqual([]);
  });
});
