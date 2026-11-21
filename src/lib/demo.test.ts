import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { roleForPath } from "@/lib/demo";

describe("roleForPath", () => {
  it("is the customer on the public site", () => {
    expect(roleForPath("/")).toBe("customer");
    expect(roleForPath("/used-cars/some-car")).toBe("customer");
  });
  it("is the dealer under /dashboard, and /platform is not a role (the platform is not part of a dealer site)", () => {
    expect(roleForPath("/dashboard")).toBe("dealer");
    expect(roleForPath("/dashboard/stock")).toBe("dealer");
    expect(roleForPath("/platform/billing")).toBe("customer");
  });
  it("does not match a path that only starts with the same letters", () => {
    expect(roleForPath("/administrator")).toBe("customer");
  });
});

import { adminReachable, isAppPath } from "@/lib/demo";
describe("isAppPath", () => {
  it("is true under /dashboard only", () => {
    expect(isAppPath("/dashboard/leads")).toBe(true);
    expect(isAppPath("/platform")).toBe(false);
    expect(isAppPath("/used-cars")).toBe(false);
  });
});

describe("adminReachable", () => {
  // The CI job may set the open switch for the whole run, and passing undefined would fall back to it, so it is cleared first.
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_ADMIN_OPEN", ""));
  afterEach(() => vi.unstubAllEnvs());
  it("is open in next dev, and closed in any build unless the open switch is 1", () => {
    expect(adminReachable("development", undefined)).toBe(true);
    expect(adminReachable("production", undefined)).toBe(false); // a build, whatever APP_ENV says, or with none
    expect(adminReachable(undefined, undefined)).toBe(false); // the tests themselves (NODE_ENV=test)
    expect(adminReachable("production", "true")).toBe(false);
    expect(adminReachable("production", "1")).toBe(true);
  });
});

import { THEME_KEY, THEME_SCRIPT, themeChoice } from "@/lib/demo";
describe("themeChoice", () => {
  it("is this page's choice first, then the stored one, else Auto", () => {
    expect(themeChoice(undefined, null)).toBe("auto");
    expect(themeChoice(undefined, "light")).toBe("light"); // also what the old toggle stored
    expect(themeChoice("dark", "light")).toBe("dark");
    expect(themeChoice("auto", "dark")).toBe("auto"); // Auto picked on a page whose storage could not forget the old choice
    expect(themeChoice(undefined, "nonsense")).toBe("auto");
  });
});

describe("THEME_SCRIPT", () => {
  // The head script, run against a stand-in page: <html>'s data attributes, the device's theme, storage and the window's events.
  function page({ device = "light", stored = null as string | null, blocked = false } = {}) {
    const html = { dataset: {} as Record<string, string> };
    let deviceChange = () => {};
    let storageEvent: (e: { key: string | null }) => void = () => {};
    const media = { get matches() { return device === "dark"; }, addEventListener: (_: string, f: () => void) => void (deviceChange = f) };
    const localStorage = { getItem: (k: string) => { if (blocked) throw new Error("blocked"); return k === THEME_KEY ? stored : null; } };
    new Function("document", "matchMedia", "localStorage", "addEventListener", THEME_SCRIPT)({ documentElement: html }, () => media, localStorage, (_: string, f: typeof storageEvent) => void (storageEvent = f));
    return {
      html,
      setDevice: (d: string) => ((device = d), deviceChange()),
      otherTab: (v: string | null) => ((stored = v), storageEvent({ key: THEME_KEY })),
    };
  }

  it("paints the stored choice, else the device's, and follows the device on Auto", () => {
    expect(page({ device: "dark", stored: "light" }).html.dataset.theme).toBe("light");
    const p = page({ device: "dark" });
    expect(p.html.dataset.theme).toBe("dark");
    p.setDevice("light");
    expect(p.html.dataset.theme).toBe("light");
  });

  it("keeps a choice made on this page when storage is blocked and the device changes", () => {
    const p = page({ device: "light", blocked: true });
    p.html.dataset.themeChoice = "light"; // what the switch sets
    p.setDevice("dark");
    expect(p.html.dataset.theme).toBe("light");
  });

  it("applies a choice made in another tab, over this page's own", () => {
    const p = page({ device: "light" });
    p.html.dataset.themeChoice = "light";
    p.otherTab("dark");
    expect([p.html.dataset.theme, p.html.dataset.themeChoice]).toEqual(["dark", undefined]);
    p.otherTab(null); // Auto there
    expect(p.html.dataset.theme).toBe("light");
  });
});
