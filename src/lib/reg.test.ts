import { describe, expect, it } from "vitest";
import { parseIrishReg, tidyKm, tidyReg } from "./reg";

const now = new Date("2026-11-11T12:00:00Z");

describe("parseIrishReg", () => {
  it("reads the year, the half and the county, in any spacing or case", () => {
    expect(parseIrishReg("191-KY-1234", now)).toEqual({ reg: "191-KY-1234", year: 2019, half: 1, county: "Kerry" });
    expect(parseIrishReg(" 242 d 98 ", now)).toEqual({ reg: "242-D-98", year: 2024, half: 2, county: "Dublin" });
    expect(parseIrishReg("08-D-12345", now)).toEqual({ reg: "08-D-12345", year: 2008, county: "Dublin" });
    expect(parseIrishReg("99-WX-1", now)?.year).toBe(1999);
  });

  it("gives null for anything that is not an Irish registration, never a guess", () => {
    expect(parseIrishReg("AB12 CDE", now)).toBeNull(); // a UK plate
    expect(parseIrishReg("191-ZZ-1234", now)).toBeNull(); // no such county
    expect(parseIrishReg("19-KY-1234", now)).toBeNull(); // 2019 needs its half
    expect(parseIrishReg("081-D-1", now)).toBeNull(); // 2008 has none
    expect(parseIrishReg("301-D-1", now)).toBeNull(); // the future
    expect(parseIrishReg("", now)).toBeNull();
  });
});

describe("tidyReg and tidyKm", () => {
  it("writes an Irish plate in its usual form and anything else in capitals", () => {
    expect(tidyReg("191d12345")).toBe("191-D-12345");
    expect(tidyReg(" 08 ky 1 ")).toBe("08-KY-1");
    expect(tidyReg("ab12 cde")).toBe("AB12 CDE"); // a UK plate stays as typed, in capitals
  });
  it("puts thousands commas in a mileage and leaves anything else alone", () => {
    expect(tidyKm("85000")).toBe("85,000");
    expect(tidyKm("1,20000")).toBe("120,000");
    expect(tidyKm("950")).toBe("950");
    expect(tidyKm("")).toBe("");
    expect(tidyKm("85k")).toBe("85k");
  });
});
