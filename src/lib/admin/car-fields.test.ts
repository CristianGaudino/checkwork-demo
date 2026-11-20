import { describe, expect, it } from "vitest";
import { carFields } from "./car-fields";

describe("carFields", () => {
  it("gives every box as text: features one per line, missing ones empty, long text cut to what the writer takes", () => {
    const f = carFields({ make: "Skoda", model: "Octavia", year: 2020, features: ["Sat nav", "Heated seats"], description: "x".repeat(5000) });
    expect(f).toMatchObject({ make: "Skoda", model: "Octavia", year: "2020", features: "Sat nav\nHeated seats", colour: "" });
    expect(f.description).toHaveLength(4000);
  });
});
