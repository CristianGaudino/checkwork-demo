import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { clashes, groupByDay, parseDriveStatus, slotData } = await import("./drives");
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
});
