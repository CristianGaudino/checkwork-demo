import { beforeEach, describe, expect, it, vi } from "vitest";

const bump = vi.fn(async (event: string) => void event);
let limiter: { limit: () => Promise<{ success: boolean }> } | undefined;
vi.mock("server-only", () => ({}));
vi.mock("@/lib/counts/store", () => ({ bump: (e: string) => bump(e) }));
vi.mock("@/lib/leads/bindings", () => ({ getBindings: () => ({ COUNT_LIMITER: limiter }) }));
import { POST } from "./route";

const post = (body: string, length: string | null = String(body.length)) => new Request("https://site.example/api/count", { method: "POST", body, headers: { "cf-connecting-ip": "203.0.113.9", ...(length !== null && { "content-length": length }) } });

beforeEach(() => {
  bump.mockClear();
  limiter = { limit: async () => ({ success: true }) };
});

describe("the public counter", () => {
  it("counts an event on the list", async () => {
    expect((await POST(post('{"event":"saved"}'))).status).toBe(204);
    expect(bump).toHaveBeenCalledWith("saved");
  });

  it("refuses a body that is not JSON, an event not on the list, and a dashboard area", async () => {
    for (const b of ["nope", '{"event":"hacked"}', '{"event":"dash:leads"}']) expect((await POST(post(b))).status).toBe(400);
    expect(bump).not.toHaveBeenCalled();
  });

  it("refuses a body over 200 bytes, whether or not it says its size, and takes a small one that does not", async () => {
    expect((await POST(post('{"event":"saved"}', "5000"))).status).toBe(413);
    expect((await POST(post(`{"event":"saved","pad":"${"x".repeat(300)}"}`, null))).status).toBe(413);
    expect(bump).not.toHaveBeenCalled();
    expect((await POST(post('{"event":"saved"}', null))).status).toBe(204);
    expect(bump).toHaveBeenCalledWith("saved");
  });

  it("does not count a visitor over the limit, and still answers quietly", async () => {
    limiter = { limit: async () => ({ success: false }) };
    expect((await POST(post('{"event":"compare"}'))).status).toBe(204);
    expect(bump).not.toHaveBeenCalled();
  });
});
