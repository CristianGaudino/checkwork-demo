import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`REDIRECT ${to}`); } }));
const { activateTrialAction, addDealershipAction, setPlanAction, toggleAddonAction } = await import("./actions");
const { dealershipsStore, invoicesStore } = await import("@/lib/admin/platform");

const form = (o: Record<string, string>) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());
const month = () => new Date().toISOString().slice(0, 7);

// Starts a trial and returns its id, the way the page does (the redirect carries the new id).
async function newTrial(name: string) {
  const err = await addDealershipAction(undefined, form({ name, town: "Testtown", owner: "Pat" })).catch((e: Error) => e);
  return String((err as Error).message).replace("REDIRECT /platform/dealerships/", "");
}

describe("platform billing upkeep", () => {
  beforeEach(async () => {
    await dealershipsStore.reset();
    await invoicesStore.reset();
  });

  it("a trial is not invoiced; ending it creates this month's invoice for its plan and add-ons", async () => {
    const id = await newTrial("Billing Test Motors");
    expect(await invoicesStore.get(`inv-${id}-${month()}`)).toBeUndefined();
    await toggleAddonAction(id, "social");
    await activateTrialAction(id);
    expect(await invoicesStore.get(`inv-${id}-${month()}`)).toMatchObject({ amountEur: 99 + 39, status: "due" });
  });

  it("changing the plan or an add-on updates the unpaid invoice, and a paid one is left alone", async () => {
    const id = await newTrial("Billing Test Two");
    await activateTrialAction(id);
    await setPlanAction(id, form({ plan: "pro" }));
    expect((await invoicesStore.get(`inv-${id}-${month()}`))!.amountEur).toBe(349);
    const inv = (await invoicesStore.get(`inv-${id}-${month()}`))!;
    await invoicesStore.put({ ...inv, status: "paid" });
    await toggleAddonAction(id, "ads");
    expect((await invoicesStore.get(`inv-${id}-${month()}`))!.amountEur).toBe(349);
  });

  it("refuses a duplicate name and a bad plan", async () => {
    await newTrial("Dup Motors");
    expect((await addDealershipAction(undefined, form({ name: "dup motors", town: "x", owner: "y" })))?.errors?.name).toMatch(/already on the platform/);
    const id = await newTrial("Plan Test");
    await setPlanAction(id, form({ plan: "platinum" }));
    expect((await dealershipsStore.get(id))!.plan).toBe("starter");
  });
});
