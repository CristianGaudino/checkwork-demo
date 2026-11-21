import { beforeEach, describe, expect, it, vi } from "vitest";

// The actions on people's data: stock alerts and the newsletter (consent only goes one way), review replies, and data requests.
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`redirect:${to}`); }, notFound: () => { throw new Error("not-found"); } }));
beforeEach(() => {
  vi.stubEnv("APP_ENV", "demo");
  vi.stubEnv("SIMULATE_INTEGRATIONS", "on");
});
let role = "Owner";
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "checkwork-demo-role" ? { value: role } : undefined) }),
  headers: async () => ({ get: () => null }),
}));
const { pauseAlertAction, removeAlertAction, unsubscribeAction } = await import("./customers/actions");
const { replyAction } = await import("./reviews/actions");
const { eraseAction, exportAction, findAction } = await import("./data-requests/actions");
const { alertsStore, drivesStore, reviewsStore, subscribersStore } = await import("@/lib/admin/collections");

const form = (o: Record<string, string>) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());
const target = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (e) {
    return String((e as Error).message).replace(/^redirect:/, "");
  }
};

describe("stock alerts and the newsletter", () => {
  it("pauses an alert and unsubscribes, and never starts either again", async () => {
    const alert = (await alertsStore.list()).find((a) => a.active)!;
    await pauseAlertAction(alert.id);
    expect((await alertsStore.get(alert.id))!.active).toBe(false);
    await pauseAlertAction(alert.id); // already paused: nothing
    const sub = (await subscribersStore.list()).find((s) => s.status === "subscribed")!;
    await unsubscribeAction(sub.id);
    expect((await subscribersStore.get(sub.id))!.status).toBe("unsubscribed");
    await unsubscribeAction("nope");
  });
  it("removes an alert", async () => {
    const alert = (await alertsStore.list())[0];
    await removeAlertAction(alert.id);
    expect(await alertsStore.get(alert.id)).toBeUndefined();
    await removeAlertAction(alert.id); // gone: nothing
  });
});

describe("review replies", () => {
  it("posts a reply, changes nothing when it is the same, and an empty box removes it", async () => {
    const review = (await reviewsStore.list()).find((r) => !r.reply)!;
    expect(await target(() => replyAction(review.id, form({ reply: "  Thanks a million  " })))).toBe("/dashboard/reviews?notice=reply-posted");
    expect((await reviewsStore.get(review.id))!.reply).toBe("Thanks a million");
    expect(await target(() => replyAction(review.id, form({ reply: "Thanks a million" })))).toBeUndefined(); // nothing changed
    expect(await target(() => replyAction(review.id, form({ reply: "" })))).toBe("/dashboard/reviews?notice=reply-removed");
    expect((await reviewsStore.get(review.id))!.reply).toBeUndefined();
  });
  it("keeps nothing when Google replies are not connected, and says so", async () => {
    vi.stubEnv("SIMULATE_INTEGRATIONS", "off");
    const review = (await reviewsStore.list()).find((r) => !r.reply)!;
    expect(await target(() => replyAction(review.id, form({ reply: "Thanks" })))).toMatch(/notice=not-(connected|installed)$/);
    expect((await reviewsStore.get(review.id))!.reply).toBeUndefined();
  });
});

describe("data requests", () => {
  it("are for owners and managers only", async () => {
    role = "Sales";
    expect(await findAction(undefined, form({ q: "x@example.com" }))).toEqual({ error: "Only an owner or manager can do this" });
    expect(await exportAction("x@example.com")).toBeNull();
    expect(await target(() => eraseAction(form({ q: "x@example.com", checked: "on" })))).toBeUndefined();
    role = "Owner";
  });
  it("find what is held, copy it for them, and erase it only once it is ticked", async () => {
    const drive = (await drivesStore.list()).find((d) => d.email)!;
    expect((await findAction(undefined, form({ q: "not an email" })))?.error).toBe("Enter the email or phone number they gave us");
    const found = await findAction(undefined, form({ q: drive.email.toUpperCase() }));
    expect(found?.total).toBeGreaterThan(0);
    expect(found?.groups?.find((g) => g.label === "Test drives")?.items[0]).toContain(drive.name);
    const copy = await exportAction(drive.email);
    expect(copy?.name).toMatch(/^data-request-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(copy!.json).testDrives.some((d: { email: string }) => d.email === drive.email)).toBe(true);
    expect(await target(() => eraseAction(form({ q: drive.email })))).toBe("/dashboard/data-requests?notice=confirm");
    expect(await drivesStore.get(drive.id)).toBeDefined();
    expect(await target(() => eraseAction(form({ q: drive.email, checked: "on" })))).toMatch(/^\/dashboard\/data-requests\?erased=[1-9]\d*$/);
    expect(await drivesStore.get(drive.id)).toBeUndefined();
  });
});
