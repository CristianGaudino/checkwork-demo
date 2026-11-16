import { describe, expect, it } from "vitest";
import { isUrgent, leadTags } from "./contact-topics";

describe("contact topics", () => {
  it("shows a lead as short tags", () => {
    expect(leadTags("buying", { timing: "this-week", hasTradeIn: "yes" })).toEqual(["Buying", "this week", "trade-in"]);
    expect(leadTags("service", { serviceNeed: "nct", urgency: "no-rush" })).toEqual(["Service", "NCT check", "no rush"]);
    expect(leadTags(undefined, {})).toEqual([]);
  });
  it("counts can't be driven and this week as urgent", () => {
    expect(isUrgent({ urgency: "cant-drive" })).toBe(true);
    expect(isUrgent({ timing: "this-week" })).toBe(true);
    expect(isUrgent({ urgency: "no-rush", timing: "looking" })).toBe(false);
  });
});
