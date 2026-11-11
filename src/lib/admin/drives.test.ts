import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { clashes, groupByDay, parseDriveStatus } = await import("./drives");
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
});
