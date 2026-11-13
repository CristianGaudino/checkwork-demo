import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => ({ get: () => null }) }));
beforeEach(() => {
  vi.stubEnv("APP_ENV", "demo");
  vi.stubEnv("UNSUBSCRIBE_SECRET", "test-secret");
});
const { POST, GET } = await import("./route");
const { alertsStore, subscribersStore } = await import("@/lib/admin/collections");
const { listActivity } = await import("@/lib/admin/activity");
const { unsubscribeToken } = await import("@/lib/unsubscribe");

const post = (t: string) => POST(new NextRequest(`https://x.test/unsubscribe/one-click?t=${t}`, { method: "POST", body: "List-Unsubscribe=One-Click" }));

describe("the mail app's one-click unsubscribe", () => {
  it("stops that subscription only, once, and records it without the person", async () => {
    const [a, b] = (await subscribersStore.list()).filter((s) => s.status === "subscribed");
    const before = (await listActivity({}, 1, 100)).total;
    expect((await post(await unsubscribeToken({ kind: "newsletter", id: a.id }, "test-secret"))).status).toBe(200);
    expect((await subscribersStore.get(a.id))!.status).toBe("unsubscribed");
    expect((await subscribersStore.get(b.id))!.status).toBe("subscribed");
    expect((await post(await unsubscribeToken({ kind: "newsletter", id: a.id }, "test-secret"))).status).toBe(200); // again: no change
    const log = await listActivity({}, 1, 100);
    expect(log.total).toBe(before + 1);
    expect(JSON.stringify(log.rows[0])).not.toContain(a.email);
    expect(JSON.stringify(log.rows[0])).not.toContain(a.id);
  });

  it("stops one stock alert and leaves the person's others on", async () => {
    const [a, b] = (await alertsStore.list()).filter((x) => x.active);
    await alertsStore.put({ ...b, email: a.email });
    expect((await post(await unsubscribeToken({ kind: "alert", id: a.id }, "test-secret"))).status).toBe(200);
    expect((await alertsStore.get(a.id))!.active).toBe(false);
    expect((await alertsStore.get(b.id))!.active).toBe(true);
  });

  it("refuses a forged token, one signed with another secret, and a record that has gone", async () => {
    const s = (await subscribersStore.list()).find((x) => x.status === "subscribed")!;
    expect((await post("n.sub-500.99999999999.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")).status).toBe(400);
    expect((await post(await unsubscribeToken({ kind: "newsletter", id: s.id }, "other-secret"))).status).toBe(400);
    expect((await subscribersStore.get(s.id))!.status).toBe("subscribed");
    expect((await post(await unsubscribeToken({ kind: "newsletter", id: "sub-999" }, "test-secret"))).status).toBe(404);
  });

  it("refuses every link when the secret is not set", async () => {
    const s = (await subscribersStore.list()).find((x) => x.status === "subscribed")!;
    const t = await unsubscribeToken({ kind: "newsletter", id: s.id }, "test-secret");
    vi.stubEnv("UNSUBSCRIBE_SECRET", "");
    expect((await post(t)).status).toBe(400);
  });

  it("sends a mail app that only opens the address to the page", async () => {
    const r = GET(new NextRequest("https://x.test/unsubscribe/one-click?t=abc"));
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("https://x.test/unsubscribe?t=abc");
  });
});
