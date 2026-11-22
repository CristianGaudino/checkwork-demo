import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { DRIVE_NEXT, clashes, filterDrives, parseDriveStatus, seededSlot, settleSeededDrive, slotData, waitingDrives } = await import("./drives");
const { demoDrives } = await import("./collections");
const { dublinDateTime } = await import("./format");
const { inDriveHours } = await import("@/lib/leads/constants");
type D = import("./collections").TestDrive;

const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 0).getTime();
const drive = (id: string, startsAt: number, o: Partial<D> = {}): D => ({ id, name: id, email: "", phone: "", carSlug: "car-1", carTitle: "Car", startsAt, status: "confirmed", notes: "", createdAt: 0, ...o });

describe("test drive agenda", () => {
  it("finds a clash for the same car within the hour, and only for open bookings", () => {
    const list = [drive("a", at(10, 11)), drive("b", at(10, 11), { carSlug: "car-2" }), drive("c", at(10, 11), { status: "cancelled" })];
    expect(clashes(list, "car-1", at(10, 11) + 30 * 60_000).map((d) => d.id)).toEqual(["a"]);
    expect(clashes(list, "car-1", at(10, 13))).toEqual([]);
    expect(clashes(list, "car-1", at(10, 11), "a")).toEqual([]);
    expect(clashes(list, "edited-car-1", at(10, 11)).map((d) => d.id)).toEqual(["a"]); // the same car after an edit gave it a new slug
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
  it("car=gone keeps the open bookings on a car no longer for sale", () => {
    const list = [drive("open", at(12, 9)), drive("over", at(12, 10), { status: "completed" }), drive("other", at(12, 11), { carSlug: "car-2" })];
    expect(filterDrives(list, { car: "gone" }, at(11, 9), new Set(["car-1"])).map((d) => d.id)).toEqual(["open"]);
    expect(filterDrives(list, { car: "gone" }, at(11, 9))).toEqual([]);
  });
  it("a seeded booking already past went ahead if confirmed, and a request moves to the same time the next day", () => {
    const now = Date.UTC(2026, 10, 19, 18, 0); // Thursday 19 November, 18:00 in Dublin
    const five = Date.UTC(2026, 10, 19, 17, 0);
    expect(settleSeededDrive(five, "confirmed", now)).toEqual({ startsAt: five, status: "completed" });
    expect(settleSeededDrive(five, "requested", now)).toEqual({ startsAt: Date.UTC(2026, 10, 20, 17, 0), status: "requested" });
    expect(settleSeededDrive(five, "cancelled", now)).toEqual({ startsAt: five, status: "cancelled" });
    const later = Date.UTC(2026, 10, 19, 19, 0);
    expect(settleSeededDrive(later, "requested", now)).toEqual({ startsAt: later, status: "requested" });
  });
  it("a request past on a Saturday moves to Monday, not to the Sunday we are closed", () => {
    const sat = Date.UTC(2026, 10, 21, 14, 0); // Saturday 21 November, 14:00 in Dublin
    expect(settleSeededDrive(sat, "requested", sat + 5 * 3_600_000).startsAt).toBe(Date.UTC(2026, 10, 23, 14, 0));
  });
  it("a seeded booking falls inside opening hours: a closed day moves on (or back), a late time to the day's last slot", () => {
    expect(seededSlot("2026-11-22", "12:00")).toBe(Date.UTC(2026, 10, 23, 12, 0)); // Sunday to Monday
    expect(seededSlot("2026-11-22", "12:00", -1)).toBe(Date.UTC(2026, 10, 21, 12, 0)); // a past one back to Saturday
    expect(seededSlot("2026-11-21", "17:30")).toBe(Date.UTC(2026, 10, 21, 15, 0)); // Saturday's last slot
    expect(seededSlot("2026-11-24", "10:30")).toBe(Date.UTC(2026, 10, 24, 10, 30)); // a Tuesday time inside the hours stays
  });
  it("every demo booking is inside opening hours, whatever day the demo is opened", () => {
    for (let d = 0; d < 7; d++) {
      vi.useFakeTimers({ now: Date.UTC(2026, 10, 16 + d, 8 + d * 2, 0) }); // each weekday, morning to evening
      for (const b of demoDrives()) expect(inDriveHours(dublinDateTime(b.startsAt).slice(0, 10), dublinDateTime(b.startsAt).slice(11)), dublinDateTime(b.startsAt)).toBe(true);
      vi.useRealTimers();
    }
  });
});
