import { describe, expect, it } from "vitest";
import { firstOpen, slotState } from "./slots";

describe("slotState", () => {
  const taken = ["2026-11-20 11:00"];
  it("is open away from a booking for the car", () => {
    expect(slotState("2026-11-20", "12:00", taken, 60, "2026-11-12 09:00")).toBe("open");
    expect(slotState("2026-11-21", "11:00", taken, 60, "2026-11-12 09:00")).toBe("open");
  });
  it("is taken within the slot of a booking for the car", () => {
    expect(slotState("2026-11-20", "11:30", taken, 60, "2026-11-12 09:00")).toBe("taken");
    expect(slotState("2026-11-20", "10:30", taken, 60, "2026-11-12 09:00")).toBe("taken");
    expect(slotState("2026-11-20", "11:30", taken, 30, "2026-11-12 09:00")).toBe("open");
  });
  it("is past for a time today that has gone", () => {
    expect(slotState("2026-11-12", "09:00", [], 60, "2026-11-12 09:00")).toBe("past");
    expect(slotState("2026-11-12", "09:30", [], 60, "2026-11-12 09:00")).toBe("open");
  });
});

describe("firstOpen", () => {
  const times = () => ["10:00", "11:00"];
  it("skips a day whose times are gone or taken", () => {
    expect(firstOpen(["2026-11-20", "2026-11-21"], ["2026-11-21 10:00"], 60, "2026-11-20 12:00", "", times)).toEqual({ date: "2026-11-21", time: "11:00" });
  });
  it("starts after a given day, and is undefined when nothing is free", () => {
    expect(firstOpen(["2026-11-20", "2026-11-21"], [], 60, "2026-11-19 09:00", "2026-11-20", times)).toEqual({ date: "2026-11-21", time: "10:00" });
    expect(firstOpen(["2026-11-20"], [], 60, "2026-11-20 12:00", "", times)).toBeUndefined();
  });
});
