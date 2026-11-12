import { describe, expect, it } from "vitest";
import { slotState } from "./slots";

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
