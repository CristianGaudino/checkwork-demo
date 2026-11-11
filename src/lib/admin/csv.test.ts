import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes what needs quoting and leaves the rest", () => {
    const csv = toCsv([{ a: 'Say "hi", then\nleave', b: 12, c: undefined }], [["Text", (r) => r.a], ["Number", (r) => r.b], ["Empty", (r) => r.c]]);
    expect(csv).toBe('Text,Number,Empty\r\n"Say ""hi"", then\nleave",12,\r\n');
  });
  it("never lets a cell run as a spreadsheet formula, but keeps negative numbers", () => {
    const csv = toCsv([{ v: "=HYPERLINK(\"x\")" }, { v: "+353 87 123 4567" }, { v: "@sum" }, { v: -5 }], [["V", (r) => r.v]]);
    expect(csv.split("\r\n").slice(1, 5)).toEqual(['"\'=HYPERLINK(""x"")"', "'+353 87 123 4567", "'@sum", "-5"]);
  });
});
