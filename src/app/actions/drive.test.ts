import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const bindings = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/lib/leads/bindings", () => ({ getBindings: () => bindings.value }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "cf-connecting-ip": "1.2.3.4" }) }));
const inStock = vi.hoisted(() => ({ ids: new Set(["4508173", "1", "12"]) }));
vi.mock("@/lib/stock", () => ({ stock: { getById: async (id: string) => (inStock.ids.has(id) ? { id } : null) } }));
const { takenDriveTimes } = await import("./drive");

const answer = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
let fetchMock: ReturnType<typeof vi.fn>;
const useFetch = (f: ReturnType<typeof vi.fn>) => vi.stubGlobal("fetch", (fetchMock = f));

beforeEach(() => {
  vi.unstubAllGlobals();
  bindings.value = {};
  process.env.DASH_SITE_KEY = "k";
  process.env.DASH_URL = "http://dash.test";
});

describe("takenDriveTimes", () => {
  it("asks the dashboard with the key and returns the times", async () => {
    useFetch(answer({ times: ["2026-12-01 10:00", "2026-12-02 14:30"] }));
    expect(await takenDriveTimes("4508173")).toEqual(["2026-12-01 10:00", "2026-12-02 14:30"]);
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(req.url).toBe("http://dash.test/api/site/v1/drives/taken?carId=4508173");
    expect(req.headers.get("authorization")).toBe("Bearer k");
  });
  it("uses the DASH binding when there is one", async () => {
    const dash = { fetch: answer({ times: ["2026-12-01 10:00"] }) };
    bindings.value = { DASH: dash };
    delete process.env.DASH_URL;
    useFetch(answer({ times: [] }));
    expect(await takenDriveTimes("1")).toEqual(["2026-12-01 10:00"]);
    expect(dash.fetch).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([[42], [null], [""], ["12a"], ["1".repeat(13)], ["1/../2"]])("asks nothing for a bad car id %j", async (id) => {
    useFetch(answer({ times: ["2026-12-01 10:00"] }));
    expect(await takenDriveTimes(id)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("asks nothing for a car that is not in stock", async () => {
    useFetch(answer({ times: ["2026-12-01 10:00"] }));
    expect(await takenDriveTimes("999")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("limits per visitor address and asks nothing once over", async () => {
    const limit = vi.fn(async () => ({ success: false }));
    bindings.value = { DRIVE_LIMITER: { limit } };
    useFetch(answer({ times: ["2026-12-01 10:00"] }));
    expect(await takenDriveTimes("1")).toEqual([]);
    expect(limit).toHaveBeenCalledWith({ key: "drive:1.2.3.4" });
    expect(fetchMock).not.toHaveBeenCalled();
    limit.mockResolvedValue({ success: true });
    expect(await takenDriveTimes("1")).toEqual(["2026-12-01 10:00"]);
  });
  it("gives [] when the dashboard is slower than the short timeout", async () => {
    vi.useFakeTimers();
    useFetch(vi.fn(() => new Promise<Response>(() => {})));
    const p = takenDriveTimes("1");
    await vi.advanceTimersByTimeAsync(1600);
    expect(await p).toEqual([]);
    vi.useRealTimers();
  });
  it("gives [] with no key or nowhere to ask", async () => {
    useFetch(answer({ times: ["2026-12-01 10:00"] }));
    delete process.env.DASH_SITE_KEY;
    expect(await takenDriveTimes("1")).toEqual([]);
    process.env.DASH_SITE_KEY = "k";
    delete process.env.DASH_URL;
    expect(await takenDriveTimes("1")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    ["a failed status", answer({ times: ["2026-12-01 10:00"] }, 500)],
    ["a throw", vi.fn(async () => Promise.reject(new Error("down")))],
    ["not JSON", vi.fn(async () => new Response("<html>", { status: 200 }))],
    ["no times", answer({})],
    ["times not an array", answer({ times: "2026-12-01 10:00" })],
    ["one bad entry", answer({ times: ["2026-12-01 10:00", "tomorrow"] })],
    ["a non-string entry", answer({ times: [1] })],
    ["a time with seconds", answer({ times: ["2026-12-01 10:00:00"] })],
    ["too many", answer({ times: Array(2001).fill("2026-12-01 10:00") })],
  ])("gives [] for %s", async (_, f) => {
    useFetch(f);
    expect(await takenDriveTimes("1")).toEqual([]);
  });
});
