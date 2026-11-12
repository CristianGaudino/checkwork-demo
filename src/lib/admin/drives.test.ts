import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { DRIVE_NEXT, clashes, filterDrives, groupByDay, parseDriveStatus, slotData, waitingDrives } = await import("./drives");
type D = import("./collections").TestDrive;

const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 0).getTime();
const drive = (id: string, startsAt: number, o: Partial<D> = {}): D => ({ id, name: id, email: "", phone: "", carSlug: "car-1", carTitle: "Car", startsAt, status: "confirmed", notes: "", createdAt: 0, ...o });

describe("test drive agenda", () => {
  it("groups by day and keeps the order it is given, soonest first or latest first", () => {
    const soonest = [drive("b", at(10, 11)), drive("a", at(10, 15)), drive("c", at(12, 9))];
    expect(groupByDay(soonest).map((x) => x.drives.map((d) => d.id))).toEqual([["b", "a"], ["c"]]);
    expect(groupByDay([...soonest].reverse()).map((x) => x.drives.map((d) => d.id))).toEqual([["c"], ["a", "b"]]);
    expect(groupByDay([])).toEqual([]);
  });
  it("finds a clash for the same car within the hour, and only for open bookings", () => {
    const list = [drive("a", at(10, 11)), drive("b", at(10, 11), { carSlug: "car-2" }), drive("c", at(10, 11), { status: "cancelled" })];
    expect(clashes(list, "car-1", at(10, 11) + 30 * 60_000).map((d) => d.id)).toEqual(["a"]);
    expect(clashes(list, "car-1", at(10, 13))).toEqual([]);
    expect(clashes(list, "car-1", at(10, 11), "a")).toEqual([]);
  });
  it("accepts only known statuses", () => {
    expect(parseDriveStatus("confirmed")).toBe("confirmed");
    expect(parseDriveStatus("deleted")).toBeUndefined();
  });
  it("offers today's open days on, and each car's open bookings in Irish time, but the one being moved", () => {
    const now = Date.UTC(2026, 10, 12, 10, 0); // Thursday 12 November, 10:00 in Dublin
    const list = [drive("a", Date.UTC(2026, 10, 13, 11, 0)), drive("b", Date.UTC(2026, 10, 13, 15, 0), { status: "cancelled" }), drive("c", Date.UTC(2026, 10, 14, 12, 30))];
    const s = slotData(list, "c", now);
    expect(s.now).toBe("2026-11-12 10:00");
    expect(s.days[0]).toBe("2026-11-12");
    expect(s.taken).toEqual({ "car-1": ["2026-11-13 11:00"] });
  });
  it("the List view searches and filters by status, who has it and when", () => {
    const now = at(11, 12);
    const list = [
      drive("a", at(10, 11), { name: "Aoife Byrne", phone: "087 111", status: "completed", assignedTo: "Conor" }),
      drive("b", at(12, 11), { name: "Ben Hayes", carTitle: "Kia Niro", status: "requested" }),
      drive("c", at(13, 11), { name: "Cara Lee", email: "cara@x.ie", assignedTo: "Ciara" }),
    ];
    const ids = (f: Parameters<typeof filterDrives>[1]) => filterDrives(list, f, now).map((d) => d.id);
    expect(ids({})).toEqual(["a", "b", "c"]);
    expect(ids({ q: "niro" })).toEqual(["b"]);
    expect(ids({ q: "087" })).toEqual(["a"]);
    expect(ids({ q: "CARA@" })).toEqual(["c"]);
    expect(ids({ status: "requested" })).toEqual(["b"]);
    expect(ids({ with: "none" })).toEqual(["b"]);
    expect(ids({ with: "Ciara" })).toEqual(["c"]);
    expect(ids({ when: "past" })).toEqual(["a"]);
    expect(ids({ when: "ahead" })).toEqual(["b", "c"]);
  });
  it("waiting to be confirmed: requests still to come, soonest first", () => {
    const list = [drive("late", at(14, 9), { status: "requested" }), drive("past", at(9, 9), { status: "requested" }), drive("soon", at(12, 9), { status: "requested" }), drive("ok", at(12, 10))];
    expect(waitingDrives(list, at(11, 12)).map((d) => d.id)).toEqual(["soon", "late"]);
  });
  it("offers next steps only for a booking still to happen", () => {
    expect(DRIVE_NEXT.requested?.map(([s]) => s)).toEqual(["confirmed", "cancelled"]);
    expect(DRIVE_NEXT.confirmed?.map(([s]) => s)).toEqual(["completed", "no-show", "cancelled"]);
    expect(DRIVE_NEXT.completed).toBeUndefined();
  });
});
