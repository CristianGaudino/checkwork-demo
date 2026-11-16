import { describe, expect, it } from "vitest";
import { feedbackDue, parseRequest, safeFrom, typesFor } from "./help-rules";

const form = (v: Record<string, string>) => (k: string) => v[k] ?? "";

describe("help rules", () => {
  it("keeps Billing and Add a module for the owner and manager", () => {
    expect(typesFor("Sales")).not.toContain("Billing");
    expect(typesFor("Finance")).not.toContain("Add a module");
    expect(typesFor("Manager")).toContain("Billing");
  });
  it("needs a type the role may use and a message", () => {
    expect(parseRequest(form({ type: "Billing", message: "Hi" }), "Sales").errors.type).toBeTruthy();
    expect(parseRequest(form({ type: "Question", message: "  " }), "Sales").errors.message).toBeTruthy();
    expect(parseRequest(form({ type: "Question", message: "Hi", steps: "x" }), "Sales").value).toEqual({ type: "Question", message: "Hi" }); // steps only for a fault
    expect(parseRequest(form({ type: "Something isn't working", message: "Hi", steps: "Clicked save" }), "Sales").value?.steps).toBe("Clicked save");
  });
  it("only takes a dashboard path as the page they came from", () => {
    expect(safeFrom("/dashboard/stock?x=1")).toBe("/dashboard/stock");
    expect(safeFrom("https://evil.example")).toBe("/dashboard");
    expect(safeFrom("//dashboard")).toBe("/dashboard");
    expect(safeFrom(undefined)).toBe("/dashboard");
  });
  it("asks for feedback once a quarter", () => {
    const now = Date.now();
    expect(feedbackDue(undefined, now)).toBe(true);
    expect(feedbackDue(now - 30 * 86_400_000, now)).toBe(false);
    expect(feedbackDue(now - 91 * 86_400_000, now)).toBe(true);
  });
});
