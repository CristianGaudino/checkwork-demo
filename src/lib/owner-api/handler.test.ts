import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { ownerGet } from "./handler";

afterEach(() => vi.unstubAllEnvs());
const call = (q: string, token?: string) => new Request(`https://site.example/api/owner/v1/summary${q}`, token ? { headers: { authorization: `Bearer ${token}` } } : {});

describe("the owner API's door", () => {
  it("answers 404 with no body when there is no token, a wrong one, or none set on the site", async () => {
    const build = vi.fn(async () => ({ ok: 1 }));
    expect((await ownerGet(call(""), "t1", build)).status).toBe(404);
    vi.stubEnv("OWNER_API_TOKEN", "right");
    const wrong = await ownerGet(call("", "wrong"), "t1", build);
    expect(wrong.status).toBe(404);
    expect(await wrong.text()).toBe("");
    expect(build).not.toHaveBeenCalled();
  });

  it("answers 400 for a day that is not a day, before working anything out", async () => {
    vi.stubEnv("OWNER_API_TOKEN", "right");
    const build = vi.fn(async () => ({ ok: 1 }));
    expect((await ownerGet(call("?to=2026-13-45", "right"), "t2", build)).status).toBe(400);
    expect((await ownerGet(call("?from=2026-03-10&to=2026-03-01", "right"), "t2", build)).status).toBe(400);
    expect(build).not.toHaveBeenCalled();
  });

  it("works a range out once, then answers it from the hour's cache", async () => {
    vi.stubEnv("OWNER_API_TOKEN", "right");
    const build = vi.fn(async () => ({ leads: 3 }));
    const q = "?from=2026-03-01&to=2026-03-31";
    expect(await (await ownerGet(call(q, "right"), "t3", build)).json()).toEqual({ leads: 3 });
    expect(await (await ownerGet(call(q, "right"), "t3", build)).json()).toEqual({ leads: 3 });
    expect(build).toHaveBeenCalledTimes(1);
  });
});
