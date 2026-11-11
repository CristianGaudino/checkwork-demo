import { describe, expect, it } from "vitest";
import { irishBankHolidays, isBankHoliday } from "./bank-holidays";

// Checked against the published Irish public holiday lists for each year.
describe("Irish bank holidays", () => {
  it("2026: every holiday, with St Stephen's Day on a Saturday moving to Monday the 28th", () => {
    expect([...irishBankHolidays(2026)].sort()).toEqual(["2026-01-01", "2026-02-02", "2026-03-17", "2026-04-06", "2026-05-04", "2026-06-01", "2026-08-03", "2026-10-26", "2026-12-25", "2026-12-26", "2026-12-28"]);
  });
  it("St Brigid's Day is 1 February when that is a Friday, else the first Monday", () => {
    expect(isBankHoliday("2030-02-01")).toBe(true); // a Friday
    expect(isBankHoliday("2027-02-01")).toBe(true); // a Monday
    expect(isBankHoliday("2023-02-06")).toBe(true); // 1 February 2023 was a Wednesday
  });
  it("a holiday on a weekend gives the next free weekday", () => {
    expect(isBankHoliday("2024-03-18")).toBe(true); // St Patrick's Day on a Sunday
    expect(["2021-12-27", "2021-12-28"].every(isBankHoliday)).toBe(true); // Christmas on a Saturday
    expect(["2022-12-26", "2022-12-27"].every(isBankHoliday)).toBe(true); // Christmas on a Sunday
    expect(isBankHoliday("2022-01-03")).toBe(true); // New Year's Day on a Saturday
  });
  it("Easter Monday moves with Easter", () => {
    expect(isBankHoliday("2025-04-21")).toBe(true);
    expect(isBankHoliday("2027-03-29")).toBe(true);
  });
  it("an ordinary day is not one", () => expect(isBankHoliday("2026-11-12")).toBe(false));
});
