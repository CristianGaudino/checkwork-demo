import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LeadRow } from "./process";

vi.mock("server-only", () => ({}));
const bindings = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("./bindings", () => ({ getBindings: () => bindings.value }));
const mirror = vi.hoisted(() => ({ fn: vi.fn(async () => {}) }));
vi.mock("@/lib/admin/real-leads", () => ({ mirrorLead: mirror.fn }));
// `after` runs its work once the response is out; here it starts at once and the test waits for it with afterwork().
const later = vi.hoisted(() => ({ jobs: [] as Promise<unknown>[] }));
vi.mock("next/server", () => ({ after: (fn: () => Promise<unknown>) => void later.jobs.push(fn()) }));
const afterwork = () => Promise.all(later.jobs.splice(0));
const { sendToDash } = await import("./dash");
const { getDeps } = await import("./deps");

const NAME = "ZZ-SENTINEL-NAME";
const PHONE = "087 919 2939";
const EMAIL = "zz-sentinel@example.com";
const row: LeadRow = {
  id: "lead-1",
  clientRef: "ref-1",
  type: "trade_in",
  carId: "1",
  carSlug: "x-1",
  carTitle: "2020 Audi A3",
  carPriceEur: 10000,
  sourcePath: "/sell",
  name: NAME,
  phone: PHONE,
  email: EMAIL,
  message: "ZZ-SENTINEL-MESSAGE",
  details: { reg: "ZZ-REG" },
  photoKeys: ["trade-in/a/1.jpg", "trade-in/a/2.jpg"],
  consentAt: new Date("2026-11-10T10:00:00Z"),
  consentVersion: "v1",
  // Not in the contract: a stray field never rides along.
  status: "new",
  notifiedAt: new Date("2026-11-10T10:00:05Z"),
} as LeadRow;

let fetchMock: ReturnType<typeof vi.fn>;
let logs: string[];
beforeEach(() => {
  bindings.value = {};
  mirror.fn.mockReset().mockResolvedValue(undefined);
  fetchMock = vi.fn(async () => new Response('{"id":"x"}', { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("DASH_SITE_KEY", "site-key");
  vi.stubEnv("DASH_URL", "https://dash.example");
  logs = [];
  for (const m of ["log", "error", "warn", "info"] as const) vi.spyOn(console, m).mockImplementation((...a) => void logs.push(a.join(" ")));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const sent = (f = fetchMock) => f.mock.calls[0][0] as Request;
const expectQuietFailure = (status?: number) => {
  expect(logs).toHaveLength(1);
  expect(JSON.parse(logs[0])).toEqual({ leadId: "lead-1", type: "trade_in", outcome: "dash_failed", ...(status ? { status } : {}) });
  for (const s of [NAME, PHONE, EMAIL, "ZZ-SENTINEL", "site-key"]) expect(logs.join("\n")).not.toContain(s);
};

describe("sendToDash", () => {
  it("posts the v1 body (the contract's fields only, times in ms, no photo keys) with the site key", async () => {
    await sendToDash(row, true);
    const req = sent();
    expect(req.method).toBe("POST");
    expect(req.url).toBe("https://dash.example/api/site/v1/leads");
    expect(req.headers.get("authorization")).toBe("Bearer site-key");
    expect(req.headers.get("content-type")).toBe("application/json");
    const body = await req.json();
    expect(Object.keys(body).sort()).toEqual(["emailed", "lead", "photoCount"]);
    expect(body.emailed).toBe(true);
    expect(body.photoCount).toBe(2);
    expect(body.lead).toEqual({
      id: "lead-1",
      clientRef: "ref-1",
      type: "trade_in",
      carId: "1",
      carSlug: "x-1",
      carTitle: "2020 Audi A3",
      carPriceEur: 10000,
      sourcePath: "/sell",
      name: NAME,
      phone: PHONE,
      email: EMAIL,
      message: "ZZ-SENTINEL-MESSAGE",
      details: { reg: "ZZ-REG" },
      consentAt: Date.parse("2026-11-10T10:00:00Z"),
      consentVersion: "v1",
      createdAt: Date.parse("2026-11-10T10:00:00Z"),
    });
    expect(body.lead).not.toHaveProperty("photoKeys");
    expect(body.lead).not.toHaveProperty("notifiedAt");
    expect(body.lead).not.toHaveProperty("status");
    expect(logs).toEqual([]);
  });

  it("goes through the DASH service binding when there is one, to the dashboard's host, and not over fetch", async () => {
    vi.stubEnv("DASH_URL", "");
    const dash = { fetch: vi.fn(async () => new Response(null, { status: 201 })) };
    bindings.value = { DASH: dash };
    await sendToDash(row, false);
    expect(fetchMock).not.toHaveBeenCalled();
    const req = sent(dash.fetch);
    expect(req.url).toBe("https://www.dash.checkwork.ie/api/site/v1/leads");
    expect(req.headers.get("authorization")).toBe("Bearer site-key");
    expect((await req.json()).emailed).toBe(false);
  });

  it("sends nothing without a key (today's behaviour), even with a binding", async () => {
    vi.stubEnv("DASH_SITE_KEY", "");
    const dash = { fetch: vi.fn() };
    bindings.value = { DASH: dash };
    await sendToDash(row, true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(dash.fetch).not.toHaveBeenCalled();
    expect(logs).toEqual([]);
  });

  it("logs a key with no address and no binding as a failure, and sends nothing", async () => {
    vi.stubEnv("DASH_URL", "");
    await sendToDash(row, true);
    expect(fetchMock).not.toHaveBeenCalled();
    expectQuietFailure();
  });

  it("takes 200 (already received) as fine", async () => {
    fetchMock.mockResolvedValue(new Response('{"id":"x"}', { status: 200 }));
    await sendToDash(row, true);
    expect(logs).toEqual([]);
  });

  it("swallows a 500 or a 401 and logs only the id, type and status", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    await expect(sendToDash(row, true)).resolves.toBeUndefined();
    expectQuietFailure(500);
    logs = [];
    fetchMock.mockResolvedValue(new Response("no", { status: 401 }));
    await sendToDash(row, true);
    expectQuietFailure(401);
  });

  it("swallows a throw, with nothing personal in the log", async () => {
    fetchMock.mockRejectedValue(new Error(`network down ${NAME} ${EMAIL}`));
    await expect(sendToDash(row, true)).resolves.toBeUndefined();
    expectQuietFailure();
  });

  it("gives up after 5 seconds", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(() => new Promise(() => {}));
    const done = sendToDash(row, true);
    await vi.advanceTimersByTimeAsync(4999);
    expect(logs).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    await expect(done).resolves.toBeUndefined();
    expectQuietFailure();
  });
});

describe("the real toAdmin", () => {
  beforeEach(() => vi.stubEnv("E2E_FAKE_BACKENDS", ""));

  it("keeps the local copy and sends to the dashboard after the answer", async () => {
    await getDeps().toAdmin!(row, true);
    await afterwork();
    expect(mirror.fn).toHaveBeenCalledWith(row, true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("still makes the local copy when the send fails", async () => {
    fetchMock.mockRejectedValue(new Error("down"));
    await expect(getDeps().toAdmin!(row, false)).resolves.toBeUndefined();
    await afterwork();
    expect(mirror.fn).toHaveBeenCalledWith(row, false);
    expectQuietFailure();
  });

  it("never waits for the dashboard before answering", async () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // a dashboard that never answers
    await expect(getDeps().toAdmin!(row, true)).resolves.toBeUndefined();
    later.jobs.splice(0);
  });

  it("still sends when the local copy fails, and reports the copy's failure", async () => {
    mirror.fn.mockRejectedValue(new Error("admin store down"));
    await expect(getDeps().toAdmin!(row, true)).rejects.toThrow("admin store down");
    await afterwork();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
