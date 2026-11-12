import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`redirect:${to}`); } }));
beforeEach(() => vi.stubEnv("APP_ENV", "demo"));
let role = "Sales";
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "checkwork-demo-role" ? { value: role } : undefined) }),
  headers: async () => ({ get: () => null }),
}));
const { openClaimAction, setClaimCostAction, setClaimStatusAction } = await import("./actions");
const { moveDriveAction } = await import("../test-drives/actions");
const { claimsStore, coverEnds, costsStore, drivesStore, leadsStore, salesStore } = await import("@/lib/admin/collections");
const { addDays } = await import("@/lib/admin/format");
const { driveTimes } = await import("@/lib/leads/constants");
const { isBankHoliday } = await import("@/lib/bank-holidays");
const { carCosts } = await import("@/lib/admin/costs");

const form = (o: Record<string, string>) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());
const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });

describe("warranty cover", () => {
  it("runs the months from the day of sale, to the day before", () => {
    expect(coverEnds({ soldOn: "2026-01-15" })).toBe("2027-01-14");
    expect(coverEnds({ soldOn: "2026-01-15", coverMonths: 36 })).toBe("2029-01-14");
    expect(coverEnds({ soldOn: "2026-03-01" })).toBe("2027-02-28");
  });
});

describe("warranty claims", () => {
  beforeEach(() => {
    role = "Sales";
  });

  it("opens a claim on a sale, in cover or not by the sale's dates, and marks the website request contacted", async () => {
    await salesStore.put({ id: "900001", carTitle: "2019 Kia Ceed", priceEur: 12000, soldOn: today, customerId: "cust-300", createdAt: 0 });
    await salesStore.put({ id: "900002", carTitle: "2015 Ford Fiesta", priceEur: 5000, soldOn: "2020-01-01", createdAt: 0 });
    await leadsStore.put({ id: "lead-w", type: "warranty", status: "new", name: "Pat", email: "p@example.com", phone: "", message: "Gearbox noise", source: "Website", notes: [], createdAt: 0 });
    expect((await openClaimAction(undefined, form({ saleId: "", fault: "x", openedOn: today })))?.errors?.saleId).toBeTruthy();
    expect((await openClaimAction(undefined, form({ saleId: "900002", fault: "x", openedOn: "2019-01-01" })))?.errors?.openedOn).toMatch(/from the sale/);
    await expect(openClaimAction(undefined, form({ saleId: "900001", fault: "Gearbox noise", openedOn: today, leadId: "lead-w" }))).rejects.toThrow(/redirect:\/dashboard\/aftersales\/claim-/);
    await expect(openClaimAction(undefined, form({ saleId: "900002", fault: "Rust", openedOn: today }))).rejects.toThrow(/redirect/);
    const [inCover, out] = ["900001", "900002"].map(async (id) => (await claimsStore.list()).find((c) => c.saleId === id)!);
    expect(await inCover).toMatchObject({ inCover: true, customerId: "cust-300", status: "open", leadId: "lead-w", carId: "900001" });
    expect((await out).inCover).toBe(false);
    expect(await leadsStore.get("lead-w")).toMatchObject({ status: "contacted" });
  });

  it("moves a claim along, and only staff who see margins set its cost, which counts in the car's cost", async () => {
    const claim = (await claimsStore.list()).find((c) => c.saleId === "900001")!;
    await setClaimStatusAction(claim.id, form({ status: "repaired" }));
    await setClaimStatusAction(claim.id, form({ status: "nonsense" }));
    expect((await claimsStore.get(claim.id))?.status).toBe("repaired");
    expect((await setClaimCostAction(claim.id, undefined, form({ costEur: "450" })))?.error).toMatch(/margins/);
    role = "Finance";
    await costsStore.put({ id: "900001", costEur: 9000 });
    expect((await setClaimCostAction(claim.id, undefined, form({ costEur: "450" })))?.saved).toBeTruthy();
    expect((await carCosts()).get("900001")).toMatchObject({ purchase: 9000, claims: 450, total: 9450 });
    await setClaimCostAction(claim.id, undefined, form({ costEur: "" }));
    expect((await carCosts()).get("900001")?.claims).toBe(0);
  });
});

describe("moving a test drive", () => {
  it("moves a booking by the same rules as a new one, and not one that has happened", async () => {
    const at = (d: string, t: string) => Date.parse(`${d}T${t}:00Z`);
    await drivesStore.put({ id: "drive-m", name: "Sam", email: "", phone: "083 000 0000", carSlug: "move-car-1", carTitle: "2018 Kia Rio", startsAt: Date.now() + 86_400_000, status: "confirmed", notes: "", createdAt: 0 });
    await drivesStore.put({ id: "drive-d", name: "Sam", email: "", phone: "083 000 0000", carSlug: "move-car-1", carTitle: "2018 Kia Rio", startsAt: Date.now() - 86_400_000, status: "completed", notes: "", createdAt: 0 });
    // The next day the dealer is open, and its first driving time.
    let day = today;
    for (let i = 1; i < 14 && (!driveTimes((day = addDays(today, i))).length || isBankHoliday(day)); i++);
    const time = driveTimes(day)[0];
    expect((await moveDriveAction("drive-d", undefined, form({ date: day, time })))?.errors?.date).toMatch(/no longer be moved/);
    expect((await moveDriveAction("drive-m", undefined, form({ date: "2020-01-01", time })))?.errors?.date).toMatch(/not passed/);
    expect((await moveDriveAction("drive-m", undefined, form({ date: day, time: "23:00" })))?.errors?.time).toMatch(/Choose a time/);
    expect((await moveDriveAction("drive-m", undefined, form({ date: day, time })))?.done).toBe("Moved.");
    expect((await drivesStore.get("drive-m"))?.startsAt).toBeGreaterThan(at(day, "00:00") - 2 * 3_600_000);
  });
});
