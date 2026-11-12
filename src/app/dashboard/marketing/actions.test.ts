import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => ({ get: () => null }) })); // who is signed in: the demo owner
// A redirect throws in Next; here it throws its target so a test can read the notice.
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`redirect:${to}`); } }));
const { composeAction } = await import("./actions");
const { setStatusAction, assignLeadAction } = await import("../leads/actions");
const { adsStore, getSettings, leadsStore, postsStore, settingsStore } = await import("@/lib/admin/collections");
const { adminCars } = await import("@/lib/admin/stock-admin");

const form = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) for (const x of [v].flat()) f.append(k, x);
  return f;
};
const notice = async (run: () => Promise<unknown>) => {
  try { await run(); } catch (e) { return /notice=([\w-]+)/.exec(String((e as Error).message))?.[1]; }
};

describe("the post composer action", () => {
  beforeEach(async () => {
    for (const s of [postsStore, adsStore]) for (const d of await s.list()) await s.remove(d.id);
  });

  it("keeps only photos of the chosen car, and drafts without publishing", async () => {
    const [car, other] = await adminCars();
    const mine = car.photos[0].src;
    const theirs = other.photos[0].src;
    const n = await notice(() => composeAction(form({ carSlug: car.slug, network: "Facebook", text: "Hello", intent: "draft", timing: "now", photos: [mine, theirs, "/etc/passwd"] })));
    expect(n).toBe("post-draft");
    const [post] = await postsStore.list();
    expect(post.status).toBe("draft");
    expect(post.photos).toEqual([mine]);
  });

  it("refuses a time that has passed, and saves nothing", async () => {
    const [car] = await adminCars();
    const n = await notice(() => composeAction(form({ carSlug: car.slug, network: "Facebook", text: "Hello", intent: "publish", timing: "later", when: "2020-01-01T10:00" })));
    expect(n).toBe("invalid-time");
    expect(await postsStore.list()).toHaveLength(0);
  });

  it("makes no ad for a scheduled post, and an ad draft with a post draft", async () => {
    const [car] = await adminCars();
    const base = { carSlug: car.slug, network: "Facebook", text: "Hello", ad: "on", platform: "Meta", budgetEur: "100" };
    await notice(() => composeAction(form({ ...base, intent: "publish", timing: "later", when: "2031-01-01T10:00" })));
    expect(await adsStore.list()).toHaveLength(0);
    expect(await notice(() => composeAction(form({ ...base, intent: "draft", timing: "now" })))).toBe("draft-ad");
    expect(await adsStore.list()).toHaveLength(1);
  });

  it("refuses an empty text or an unknown car", async () => {
    const [car] = await adminCars();
    expect(await notice(() => composeAction(form({ carSlug: car.slug, network: "Facebook", text: " ", intent: "draft", timing: "now" })))).toBe("invalid");
    expect(await notice(() => composeAction(form({ carSlug: "nope-1", network: "Facebook", text: "x", intent: "draft", timing: "now" })))).toBe("invalid");
  });
});

describe("lead quick actions", () => {
  beforeEach(async () => {
    await settingsStore.reset();
    await leadsStore.reset();
  });

  it("ignores a status that is not a status", async () => {
    const lead = (await leadsStore.list()).find((l) => l.status === "new")!;
    await setStatusAction(lead.id, form({ status: "hacked" }));
    expect((await leadsStore.get(lead.id))!.status).toBe("new");
    await setStatusAction(lead.id, form({ status: "won" }));
    expect((await leadsStore.get(lead.id))!.status).toBe("won");
  });

  it("Undo after won or lost puts back the follow-up day and the lost reason the move cleared", async () => {
    const lead = (await leadsStore.list()).find((l) => l.status === "contacted")!;
    await leadsStore.put({ ...lead, followUpOn: "2031-01-02", lostReason: undefined });
    await setStatusAction(lead.id, form({ status: "lost" }));
    await leadsStore.put({ ...(await leadsStore.get(lead.id))!, lostReason: "Price" });
    expect((await leadsStore.get(lead.id))!.followUpOn).toBeUndefined();
    await setStatusAction(lead.id, form({ status: "contacted", on: "2031-01-02", reason: "Price" })); // Undo
    expect(await leadsStore.get(lead.id)).toMatchObject({ status: "contacted", followUpOn: "2031-01-02", lostReason: undefined });
    await setStatusAction(lead.id, form({ status: "lost", reason: "Price" }));
    expect((await leadsStore.get(lead.id))!.lostReason).toBe("Price");
    await setStatusAction(lead.id, form({ status: "contacted", on: "not a day" }));
    expect((await leadsStore.get(lead.id))!.followUpOn).toBeUndefined(); // only a real day comes back
  });

  it("gives a lead only to someone on the team, and Nobody clears it", async () => {
    const lead = (await leadsStore.list())[0];
    await assignLeadAction(lead.id, form({ assignedTo: "Somebody Else" }));
    expect((await leadsStore.get(lead.id))!.assignedTo).toBeUndefined();
    const name = (await getSettings()).team[0].name;
    await assignLeadAction(lead.id, form({ assignedTo: name }));
    expect((await leadsStore.get(lead.id))!.assignedTo).toBe(name);
    await assignLeadAction(lead.id, form({ assignedTo: "" }));
    expect((await leadsStore.get(lead.id))!.assignedTo).toBeUndefined();
  });
});
