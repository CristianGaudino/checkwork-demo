import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { VehicleSwitch } from "./VehicleSwitch";

vi.mock("next/navigation", () => ({ usePathname: () => "/new-cars/audi" }));

const t = (id: string, href: string, enabled: boolean) => ({ id, label: id, href, enabled }) as never;
const html = (types: never[]) => renderToStaticMarkup(createElement(VehicleSwitch, { types }));

describe("VehicleSwitch", () => {
  it("shows nothing for one section, or for none", () => {
    expect(html([t("used", "/used-cars", true), t("new", "/new-cars", false)])).toBe("");
    expect(html([])).toBe("");
  });
  it("lists only the enabled sections and marks the current one", () => {
    const out = html([t("used", "/used-cars", true), t("new", "/new-cars", true), t("commercial", "/commercial", false)]);
    expect(out).toContain("/used-cars");
    expect(out).not.toContain("/commercial");
    expect(out).toMatch(/href="\/new-cars"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/new-cars"/);
  });
});
