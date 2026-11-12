import { describe, expect, it } from "vitest";
import { FOOTER_GROUPS, HEADER_LINKS, MENU_GROUPS, MENU_PRIMARY, PAGE, VEHICLE_TYPES } from "./nav";

describe("navigation", () => {
  it("keeps seven links at most at the top: the vehicle sections and the header links", () => {
    expect(VEHICLE_TYPES.filter((v) => v.enabled).length + HEADER_LINKS.length).toBeLessThanOrEqual(7);
  });
  it("puts every page in the menu once, apart from home and the legal pages", () => {
    const menu = [...MENU_PRIMARY, ...MENU_GROUPS.flatMap((g) => g.links)].map((l) => l.href);
    expect(new Set(menu).size).toBe(menu.length);
    const pages = Object.values(PAGE).map((l) => l.href).filter((h) => !["/", "/privacy", "/terms"].includes(h));
    for (const h of pages) expect(menu).toContain(h);
  });
  it("the footer repeats the menu", () => {
    expect(FOOTER_GROUPS.slice(1)).toEqual([...MENU_GROUPS]);
    expect(FOOTER_GROUPS[0].links).toEqual(MENU_PRIMARY);
  });
});
