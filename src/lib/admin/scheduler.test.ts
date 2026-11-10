import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { sendDuePosts } = await import("./scheduler");
const { postsStore } = await import("./collections");

const post = (id: string, over: object) => ({ id, network: "Facebook" as const, text: "t", status: "scheduled" as const, createdAt: 1, ...over });

describe("sendDuePosts", () => {
  beforeEach(async () => {
    await postsStore.reset();
    for (const p of await postsStore.list()) await postsStore.remove(p.id);
  });
  it("posts what is due, leaves what is not, and posts nothing twice", async () => {
    await postsStore.put(post("due", { scheduledFor: 1000 }));
    await postsStore.put(post("later", { scheduledFor: 9000 }));
    await postsStore.put(post("draft", { status: "draft" }));
    expect(await sendDuePosts(5000)).toBe(1);
    expect((await postsStore.get("due"))?.status).toBe("posted");
    expect((await postsStore.get("later"))?.status).toBe("scheduled");
    expect((await postsStore.get("draft"))?.status).toBe("draft");
    expect(await sendDuePosts(5000)).toBe(0);
  });
  it("keeps a post scheduled when sending fails", async () => {
    vi.stubEnv("SIMULATE_INTEGRATIONS", "off");
    await postsStore.put(post("due", { scheduledFor: 1000 }));
    expect(await sendDuePosts(5000)).toBe(0);
    expect((await postsStore.get("due"))?.status).toBe("scheduled");
    vi.unstubAllEnvs();
    expect(await sendDuePosts(5000 + 60_000)).toBe(0); // claimed a minute ago: left alone
    expect(await sendDuePosts(5000 + 6 * 60_000)).toBe(1); // after the pause it is tried again, and marked simulated
    expect((await postsStore.get("due"))?.simulated).toBe(true);
  });
});
