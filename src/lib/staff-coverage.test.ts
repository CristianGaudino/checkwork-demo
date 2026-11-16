import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Every dashboard server action must ask src/lib/staff.ts first: an action answers a POST to any page, so the proxy's gate is not enough.
// This reads the files, so a new action without the check fails here, however it is written.
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
const actionFiles = [...files("src/app/dashboard"), "src/lib/ai/actions.ts"].filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts")).filter((f) => /^["']use server["'];/m.test(readFileSync(f, "utf8")));

describe("the dashboard's server actions", () => {
  it("are found", () => expect(actionFiles.length).toBeGreaterThan(10));

  for (const f of actionFiles) {
    it(`${f}: every exported action checks the login first`, () => {
      const src = readFileSync(f, "utf8");
      expect(src, "an action exported another way (export const, export {...}) could skip the check").not.toMatch(/^export (const|let|\{)/m);
      const bodies = [...src.matchAll(/^export async function (\w+)[\s\S]*?\{\r?\n(.*)/gm)];
      expect(bodies.length).toBeGreaterThan(0);
      for (const [, name, first] of bodies) expect(first, name).toMatch(/await requireStaff\(\)/);
    });
  }
});
