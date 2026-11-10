import { describe, expect, it } from "vitest";
import { driveDays, driveTimes } from "./constants";
import { leadSchema } from "./schema";

describe("driveTimes", () => {
  it("runs from opening until an hour before closing, in half hours", () => {
    const tue = driveTimes("2026-11-10"); // a Tuesday: 09:30 to 18:00
    expect(tue[0]).toBe("09:30");
    expect(tue.at(-1)).toBe("17:00");
    const sat = driveTimes("2026-11-14"); // a Saturday: 10:00 to 16:00
    expect(sat[0]).toBe("10:00");
    expect(sat.at(-1)).toBe("15:00");
  });
  it("is empty on a day we are closed", () => expect(driveTimes("2026-11-15")).toEqual([])); // a Sunday
});

describe("driveDays", () => {
  const days = driveDays(new Date("2026-11-13T10:00:00Z")); // a Friday
  it("starts tomorrow, skips closed days and stops at three weeks", () => {
    expect(days[0]).toBe("2026-11-14");
    expect(days).not.toContain("2026-11-15");
    expect(days[1]).toBe("2026-11-16");
    expect(days.at(-1)! <= "2026-12-04").toBe(true);
  });
  it("uses the Irish date, so late evening in Ireland is still that day", () => {
    expect(driveDays(new Date("2026-11-13T23:30:00Z"))[0]).toBe("2026-11-14");
  });
});

describe("leadSchema for a test drive and an alert", () => {
  const base = { clientRef: crypto.randomUUID(), sourcePath: "/used-cars/x", name: "Test buyer", email: "a@example.com", consent: "yes" };
  it("accepts a real day and time, and refuses a time that is not a slot or a day that is closed", () => {
    const day = driveDays()[0];
    const time = driveTimes(day)[0];
    expect(leadSchema.safeParse({ ...base, type: "test_drive", carId: "1", driveDate: day, driveTime: time }).success).toBe(true);
    expect(leadSchema.safeParse({ ...base, type: "test_drive", carId: "1", driveDate: day, driveTime: "03:00" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...base, type: "test_drive", carId: "1", driveDate: "2020-01-01", driveTime: time }).success).toBe(false);
    expect(leadSchema.safeParse({ ...base, type: "test_drive", carId: "1" }).success).toBe(false);
  });
  it("takes an alert with just an email, and refuses an unknown kind or no email", () => {
    expect(leadSchema.safeParse({ clientRef: base.clientRef, sourcePath: "/", email: "a@example.com", consent: "yes", type: "alert", alertKind: "price-drop", carId: "1" }).success).toBe(true);
    expect(leadSchema.safeParse({ clientRef: base.clientRef, sourcePath: "/", email: "a@example.com", consent: "yes", type: "alert", alertKind: "spam" }).success).toBe(false);
    expect(leadSchema.safeParse({ clientRef: base.clientRef, sourcePath: "/", phone: "0871234567", consent: "yes", type: "alert", alertKind: "price-drop" }).success).toBe(false);
  });
});
