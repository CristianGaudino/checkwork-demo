import { describe, expect, it } from "vitest";
import { refView } from "./activity-refs";

const people = new Map([["lead:lead-1", "Saoirse Ryan"]]);
const exists = (kind: string, id: string) => (kind === "car" ? id === "1" : kind === "lead" ? people.has(`lead:${id}`) : true);

describe("refView", () => {
  it("names a person from the live record and links to it", () => {
    expect(refView({ refKind: "lead", refId: "lead-1", refLabel: null }, people, exists)).toEqual({ label: "Saoirse Ryan", href: "/dashboard/leads/lead-1" });
  });
  it("a deleted person leaves no name and no link", () => {
    expect(refView({ refKind: "lead", refId: "lead-9", refLabel: null }, people, exists)).toEqual({ label: "A deleted lead" });
    expect(refView({ refKind: "drive", refId: "d-1", refLabel: null }, people, () => false)).toEqual({ label: "A deleted test drive" });
  });
  it("a car keeps its title, and loses its link once deleted", () => {
    expect(refView({ refKind: "car", refId: "1", refLabel: "2016 Hyundai Tucson" }, people, exists)).toEqual({ label: "2016 Hyundai Tucson", href: "/dashboard/stock/1" });
    expect(refView({ refKind: "car", refId: "2", refLabel: "2015 Ford Focus" }, people, exists)).toEqual({ label: "2015 Ford Focus" });
  });
  it("an entry about nothing in particular has no record", () => {
    expect(refView({ refKind: null, refId: null, refLabel: null }, people, exists)).toBeNull();
  });
});

describe("where each record links", () => {
  it("goes to the page that shows it", () => {
    const live = () => true;
    const href = (refKind: Parameters<typeof refView>[0]["refKind"]) => refView({ refKind, refId: "x", refLabel: "Label" }, people, live)?.href;
    expect(href("drive")).toBe("/dashboard/test-drives/x");
    expect(href("alert")).toBe("/dashboard/customers?tab=alerts");
    expect(href("subscriber")).toBe("/dashboard/customers?tab=newsletter");
    expect(href("review")).toBe("/dashboard/reviews");
    expect(href("post")).toBe("/dashboard/marketing?tab=posts");
    expect(href("ad")).toBe("/dashboard/marketing?tab=posts");
    expect(href("newsletter")).toBe("/dashboard/marketing?tab=newsletters");
    expect(href("team")).toBe("/dashboard/settings?section=team");
  });
});
