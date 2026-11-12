import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => ({ get: () => null }) }));
const { addDriveAction, assignDriveAction, setDriveStatusAction } = await import("./actions");
const { drivesStore, getSettings } = await import("@/lib/admin/collections");
const { adminCars } = await import("@/lib/admin/stock-admin");
const { addDays, dublinDay } = await import("@/lib/admin/format");
const { driveTimes } = await import("@/lib/leads/constants");
const { isBankHoliday } = await import("@/lib/bank-holidays");
const { forSale } = await import("@/lib/stock/types");

const form = (o: Record<string, string>) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());
const today = dublinDay();
// Days from today on that match: an open day, a closed one, a bank holiday.
const firstDay = (from: number, test: (d: string) => boolean) => Array.from({ length: 60 }, (_, i) => addDays(today, from + i)).find(test);
const open = (from: number) => firstDay(from, (d) => driveTimes(d).length > 0)!;
const base = async (o: Record<string, string> = {}) => ({ name: "Desk booker", phone: "+353 83 000 1234", carSlug: (await adminCars()).filter(forSale)[5].slug, date: open(20), time: "11:00", ...o });

describe("a booking taken at the desk", () => {
  it("says what is missing", async () => {
    const r = await addDriveAction(undefined, form({}));
    expect(Object.keys(r?.errors ?? {})).toEqual(expect.arrayContaining(["name", "phone", "carSlug", "date", "time"]));
  });
  it("refuses a car not in stock, a day gone, a day too far, a closed day and a time out of hours", async () => {
    expect((await addDriveAction(undefined, form(await base({ carSlug: "no-such-car" }))))?.errors).toEqual({ carSlug: "That car is not in stock" });
    expect((await addDriveAction(undefined, form(await base({ date: "2020-01-01" }))))?.errors?.date).toBe("Choose a day that has not passed");
    expect((await addDriveAction(undefined, form(await base({ date: addDays(today, 75) }))))?.errors?.date).toBe("Choose a day in the next two months");
    const closed = firstDay(1, (d) => driveTimes(d).length === 0 && !isBankHoliday(d));
    if (closed) expect((await addDriveAction(undefined, form(await base({ date: closed }))))?.errors?.date).toBe("We're closed that day");
    const holiday = firstDay(1, isBankHoliday);
    if (holiday) expect((await addDriveAction(undefined, form(await base({ date: holiday }))))?.errors?.date).toBe("That's a bank holiday. We're closed");
    expect((await addDriveAction(undefined, form(await base({ time: "06:00" }))))?.errors?.time).toMatch(/^Choose a time from /);
  });
  it("books a free time, refuses the same car within the slot, and keeps who takes them out only if they are on the team", async () => {
    const team = (await getSettings()).team;
    const first = await addDriveAction(undefined, form(await base({ date: open(25), assignedTo: team[1].name })));
    expect(first).toMatchObject({ done: expect.stringContaining("Booked Desk booker"), day: open(25) });
    const made = (await drivesStore.list()).find((d) => d.name === "Desk booker" && dublinDay(d.startsAt) === open(25))!;
    expect(made).toMatchObject({ status: "confirmed", assignedTo: team[1].name });
    expect((await addDriveAction(undefined, form(await base({ date: open(25), time: "11:30" }))))?.errors?.time).toMatch(/already booked around then/);
    await addDriveAction(undefined, form(await base({ date: open(30), name: "Outsider pick", assignedTo: "Somebody Else" })));
    expect((await drivesStore.list()).find((d) => d.name === "Outsider pick")!.assignedTo).toBeUndefined();
  });
});

describe("a booking's status and who takes it out", () => {
  it("moves only to a known status", async () => {
    const drive = (await drivesStore.list()).find((d) => d.status === "requested")!;
    await setDriveStatusAction(drive.id, "hacked");
    expect((await drivesStore.get(drive.id))!.status).toBe("requested");
    await setDriveStatusAction(drive.id, "confirmed");
    expect((await drivesStore.get(drive.id))!.status).toBe("confirmed");
  });
  it("is someone on the team, or nobody; any other name is refused", async () => {
    const drive = (await drivesStore.list())[0];
    const name = (await getSettings()).team[1].name;
    await assignDriveAction(drive.id, name);
    expect((await drivesStore.get(drive.id))!.assignedTo).toBe(name);
    await assignDriveAction(drive.id, "Somebody Else");
    expect((await drivesStore.get(drive.id))!.assignedTo).toBe(name);
    await assignDriveAction(drive.id, "");
    expect((await drivesStore.get(drive.id))!.assignedTo).toBeUndefined();
  });
});
