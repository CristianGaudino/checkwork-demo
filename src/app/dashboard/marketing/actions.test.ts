import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => ({ get: () => null }) })); // who is signed in: the demo owner
// A redirect throws in Next; here it throws its target so a test can read the notice.
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`redirect:${to}`); } }));
const { composeAction, composerCarAction, createNewsletterAction, deleteAdAction, deleteNewsletterAction, deletePostAction, publishPostAction, sendNewsletterAction, startAdAction } = await import("./actions");
const { addNoteAction, setStatusAction, assignLeadAction, setFollowUpAction, setLostReasonAction } = await import("../leads/actions");
const { adsStore, getSettings, leadsStore, newslettersStore, postsStore, settingsStore } = await import("@/lib/admin/collections");
const { NETWORKS } = await import("@/lib/admin/networks");
const { forSale } = await import("@/lib/stock/types");
const { addDays, dublinDay } = await import("@/lib/admin/format");
const { noticesStore } = await import("@/lib/admin/notifications");
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

describe("publishing, ads and newsletters", () => {
  beforeEach(async () => {
    vi.stubEnv("SIMULATE_INTEGRATIONS", "on");
    for (const s of [postsStore, adsStore, newslettersStore]) for (const d of await s.list()) await s.remove(d.id);
  });

  it("publishes a post now, and starts its ad with it", async () => {
    const car = (await adminCars()).filter(forSale)[0];
    const base = { carSlug: car.slug, network: "Instagram", text: "Hello", intent: "publish", timing: "now" };
    expect(await notice(() => composeAction(form(base)))).toBe("post-published");
    expect((await postsStore.list())[0]).toMatchObject({ status: "posted", simulated: true });
    expect(await notice(() => composeAction(form({ ...base, ad: "on", platform: "Google", budgetEur: "150" })))).toBe("published-ad");
    expect((await adsStore.list())[0]).toMatchObject({ status: "running", platform: "Google", budgetEur: 150 });
  });

  it("refuses an ad budget out of range or an unknown platform", async () => {
    const car = (await adminCars()).filter(forSale)[0];
    const base = { carSlug: car.slug, network: "Facebook", text: "Hello", intent: "draft", timing: "now", ad: "on" };
    expect(await notice(() => composeAction(form({ ...base, platform: "Meta", budgetEur: "5" })))).toBe("invalid");
    expect(await notice(() => composeAction(form({ ...base, platform: "TikTok", budgetEur: "100" })))).toBe("invalid");
  });

  it("keeps a draft when posting is not connected, and says so", async () => {
    vi.stubEnv("SIMULATE_INTEGRATIONS", "off");
    const car = (await adminCars()).filter(forSale)[0];
    const n = await notice(() => composeAction(form({ carSlug: car.slug, network: "Facebook", text: "Hello", intent: "publish", timing: "now" })));
    expect(n).toMatch(/^social-not-/);
    expect((await postsStore.list())[0].status).toBe("draft");
  });

  it("publishes, starts and deletes drafts from the list; an unknown one is refused", async () => {
    const car = (await adminCars()).filter(forSale)[0];
    await notice(() => composeAction(form({ carSlug: car.slug, network: "Facebook", text: "Hello", intent: "draft", timing: "now", ad: "on", platform: "Meta", budgetEur: "100" })));
    const [post] = await postsStore.list();
    const [ad] = await adsStore.list();
    expect(await notice(() => publishPostAction(post.id))).toBe("post-published");
    expect((await postsStore.get(post.id))!.status).toBe("posted");
    expect(await notice(() => startAdAction(ad.id))).toBe("ad-started");
    expect((await adsStore.get(ad.id))!.status).toBe("running");
    expect(await notice(() => publishPostAction("nope"))).toBe("invalid");
    expect(await notice(() => startAdAction("nope"))).toBe("invalid");
    expect(await notice(() => deletePostAction(post.id))).toBe("deleted");
    expect(await notice(() => deleteAdAction(ad.id))).toBe("deleted");
    expect(await postsStore.list()).toHaveLength(0);
    expect(await adsStore.list()).toHaveLength(0);
  });

  it("suggests text for every network for a car on sale, and nothing for a car not on sale", async () => {
    const cars = await adminCars();
    const c = await composerCarAction(cars.filter(forSale)[0].slug);
    expect(Object.keys(c!.text)).toEqual([...NETWORKS]);
    expect(c!.photos.length).toBeLessThanOrEqual(6);
    const gone = cars.find((x) => !forSale(x));
    if (gone) expect(await composerCarAction(gone.slug)).toBeNull();
    expect(await composerCarAction("nope")).toBeNull();
  });

  it("writes a newsletter from the stock or by hand, sends a draft once, and deletes", async () => {
    expect(await notice(() => createNewsletterAction(form({ intent: "write" })))).toBe("letter-created");
    expect(await notice(() => createNewsletterAction(form({ intent: "save", subject: "", body: "x" })))).toBe("invalid");
    expect(await notice(() => createNewsletterAction(form({ intent: "save", subject: "Hi", body: "News" })))).toBe("letter-created");
    const [first] = await newslettersStore.list();
    expect(await notice(() => sendNewsletterAction(first.id))).toBe("letter-sent");
    expect((await newslettersStore.get(first.id))!.status).toBe("sent");
    expect(await notice(() => sendNewsletterAction(first.id))).toBe("invalid"); // never twice
    expect(await notice(() => deleteNewsletterAction(first.id))).toBe("deleted");
    expect(await newslettersStore.get(first.id)).toBeUndefined();
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

  it("sets a follow-up 1, 3 or 7 days on, or a typed day; refuses a day gone, a year out, or a closed lead; clears it", async () => {
    const lead = (await leadsStore.list()).find((l) => l.status === "contacted")!;
    const today = dublinDay();
    await setFollowUpAction(lead.id, form({ in: "3" }));
    expect((await leadsStore.get(lead.id))!.followUpOn).toBe(addDays(today, 3));
    await setFollowUpAction(lead.id, form({ in: "5" })); // not a choice offered
    expect((await leadsStore.get(lead.id))!.followUpOn).toBe(addDays(today, 3));
    await setFollowUpAction(lead.id, form({ on: "2020-01-01" }));
    await setFollowUpAction(lead.id, form({ on: addDays(today, 400) }));
    expect((await leadsStore.get(lead.id))!.followUpOn).toBe(addDays(today, 3));
    await setFollowUpAction(lead.id, form({ on: addDays(today, 10) }));
    expect((await leadsStore.get(lead.id))!.followUpOn).toBe(addDays(today, 10));
    await setFollowUpAction(lead.id, form({ clear: "1" }));
    expect((await leadsStore.get(lead.id))!.followUpOn).toBeUndefined();
    const won = (await leadsStore.list()).find((l) => l.status === "won")!;
    await setFollowUpAction(won.id, form({ in: "1" }));
    expect((await leadsStore.get(won.id))!.followUpOn).toBeUndefined();
  });

  it("takes a lost reason from the list only, and only on a lost lead", async () => {
    const lost = (await leadsStore.list()).find((l) => l.status === "lost")!;
    await setLostReasonAction(lost.id, form({ reason: "Price" }));
    expect((await leadsStore.get(lost.id))!.lostReason).toBe("Price");
    await setLostReasonAction(lost.id, form({ reason: "Made up" }));
    expect((await leadsStore.get(lost.id))!.lostReason).toBe("Price");
    const open = (await leadsStore.list()).find((l) => l.status === "contacted")!;
    await setLostReasonAction(open.id, form({ reason: "Price" }));
    expect((await leadsStore.get(open.id))!.lostReason).toBeUndefined();
  });

  it("tells the person a lead is given to, in their bell, unless they took it themselves", async () => {
    vi.stubEnv("APP_ENV", "demo"); // the demo bar counts: with no role chosen, the owner is signed in
    const lead = (await leadsStore.list()).find((l) => !l.assignedTo)!;
    const [me, other] = (await getSettings()).team;
    const count = async () => (await noticesStore.list()).filter((n) => n.kind === "assigned" && n.href === `/dashboard/leads/${lead.id}`).length;
    const before = await count();
    await assignLeadAction(lead.id, form({ assignedTo: me.name }));
    expect(await count()).toBe(before);
    await assignLeadAction(lead.id, form({ assignedTo: other.name }));
    expect(await count()).toBe(before + 1);
    vi.unstubAllEnvs();
  });

  it("adds a note, and refuses an empty one", async () => {
    const lead = (await leadsStore.list())[0];
    const before = lead.notes.length;
    await addNoteAction(lead.id, form({ note: "   " }));
    expect((await leadsStore.get(lead.id))!.notes).toHaveLength(before);
    await addNoteAction(lead.id, form({ note: "Rang back, coming Saturday" }));
    expect((await leadsStore.get(lead.id))!.notes.at(-1)!.text).toBe("Rang back, coming Saturday");
  });
});
