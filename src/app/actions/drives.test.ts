import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { takenDriveTimes } = await import("./drives");
const { drivesStore, getSettings } = await import("@/lib/admin/collections");
const { stock } = await import("@/lib/stock");
const { dublinMs } = await import("@/lib/admin/format");
const { driveDays } = await import("@/lib/leads/constants");

describe("the times a car is already out, for the website's booking form", () => {
  it("are the times within a slot of an open booking for that car, and only those", async () => {
    const car = (await stock.query({ condition: "used", make: [], model: [], body: [], fuel: [], sort: "newest", page: 1, pageSize: 1 })).cars[0];
    for (const d of await drivesStore.list()) if (d.carSlug === car.slug) await drivesStore.remove(d.id);
    expect(await takenDriveTimes(car.id)).toEqual([]);
    const day = driveDays()[5];
    const base = { name: "x", email: "", phone: "", carSlug: car.slug, carTitle: "x", notes: "", createdAt: 0 };
    await drivesStore.put({ ...base, id: "t-open", startsAt: dublinMs(day, "12:00"), status: "confirmed" });
    await drivesStore.put({ ...base, id: "t-over", startsAt: dublinMs(day, "15:00"), status: "cancelled" });
    const slot = (await getSettings()).driveSlotMinutes;
    const taken = await takenDriveTimes(car.id);
    expect(taken).toContain(`${day} 12:00`);
    expect(taken.every((t) => t.startsWith(day))).toBe(true);
    expect(taken).not.toContain(`${day} 15:00`); // a cancelled booking frees its time
    if (slot === 60) expect(taken).toEqual([`${day} 11:30`, `${day} 12:00`, `${day} 12:30`]);
  });
  it("still count a booking made before the car's make, model or year was edited", async () => {
    const car = (await stock.query({ condition: "used", make: [], model: [], body: [], fuel: [], sort: "newest", page: 1, pageSize: 1 })).cars[0];
    const day = driveDays()[6];
    await drivesStore.put({ id: "t-old-slug", name: "x", email: "", phone: "", carSlug: `old-make-model-2001-${car.id}`, carTitle: "x", notes: "", createdAt: 0, startsAt: dublinMs(day, "10:00"), status: "requested" });
    await drivesStore.put({ id: "t-other-car", name: "x", email: "", phone: "", carSlug: `old-make-model-2001-9${car.id}`, carTitle: "x", notes: "", createdAt: 0, startsAt: dublinMs(day, "16:00"), status: "requested" });
    const taken = await takenDriveTimes(car.id);
    expect(taken).toContain(`${day} 10:00`);
    expect(taken).not.toContain(`${day} 16:00`); // another car whose id only ends the same way
  });
  it("is nothing for an id that is not a car, or not a string", async () => {
    expect(await takenDriveTimes("no-such-car")).toEqual([]);
    expect(await takenDriveTimes(42)).toEqual([]);
    expect(await takenDriveTimes("x".repeat(100))).toEqual([]);
  });
});
