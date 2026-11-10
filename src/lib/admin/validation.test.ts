import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fieldErrors } from "./validation";

describe("fieldErrors", () => {
  it("gives the first message for each field", () => {
    const r = z.object({ name: z.string().min(1, "Enter a name").min(3, "Too short"), age: z.number("Enter an age") }).safeParse({ name: "", age: "x" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)).toEqual({ name: "Enter a name", age: "Enter an age" });
  });
});
