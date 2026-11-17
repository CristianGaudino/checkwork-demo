import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AFFILIATIONS, AFFILIATION_KINDS } from "./affiliations";
import { SITE_SLUG } from "./site";

// Every entry a client site adds is checked here, so a wrong path or a stray dash fails the build instead of showing on the live site.
describe("the dealer's affiliations", () => {
  it("are none on the demo: a made-up dealer claims no real membership", () => {
    if (SITE_SLUG === "checkwork-demo") expect(AFFILIATIONS).toEqual([]);
  });

  it.each(AFFILIATIONS.map((a) => [a.name, a] as const))("%s is complete and safe to show", (_, a) => {
    expect(AFFILIATION_KINDS).toContain(a.kind);
    expect(a.name.trim()).toBe(a.name);
    expect(a.text).toMatch(/^[A-Z].*\.$/); // one sentence, as the pages put it after the name
    expect(`${a.name} ${a.text}`).not.toMatch(/[—–]/); // no em or en dashes on the site
    if (a.href) expect(new URL(a.href).protocol).toBe("https:");
    if (a.logo) {
      expect(a.logo.src).toMatch(/^\/affiliations\/[\w.-]+\.(svg|png|webp)$/);
      expect(existsSync(join(process.cwd(), "public", a.logo.src))).toBe(true);
    }
  });

  it("never names the same body twice", () => {
    expect(new Set(AFFILIATIONS.map((a) => a.name)).size).toBe(AFFILIATIONS.length);
  });
});
