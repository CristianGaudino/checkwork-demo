import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
let role: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "checkwork-demo-role" && role ? { value: role } : undefined) }),
  headers: async () => ({ get: () => null }),
}));
const { listActivity, logActivity, resetActivity } = await import("./activity");

// The memory path (no D1 binding): the same rules as on D1 (activity.int.test.ts).
describe("activity history", () => {
  beforeEach(async () => {
    role = undefined;
    await resetActivity();
  });

  it("starts from a lived-in demo history, newest first", async () => {
    const { rows, total } = await listActivity({}, 1, 50);
    expect(total).toBeGreaterThan(50);
    expect(rows).toHaveLength(50);
    expect(rows.map((r) => r.at)).toEqual([...rows.map((r) => r.at)].sort((a, b) => b - a));
  });

  it("records the signed-in person, and never stores the name of a person's record", async () => {
    role = "Sales";
    await logActivity("leads", "Added a note", { kind: "lead", id: "lead-1001", label: "Saoirse Ryan" });
    await logActivity("stock", "Marked sold", { kind: "car", id: "4710001", label: "2016 Hyundai Tucson" });
    const [car, lead] = (await listActivity({}, 1, 2)).rows;
    expect(lead).toMatchObject({ actor: "Conor Doyle", area: "leads", refKind: "lead", refId: "lead-1001", refLabel: null });
    expect(car).toMatchObject({ refLabel: "2016 Hyundai Tucson" });
    await logActivity("stock", "Synced", undefined, "DoneDeal sync");
    expect((await listActivity({}, 1, 1)).rows[0].actor).toBe("DoneDeal sync");
  });

  it("filters by area, person and time; the area counts follow the other filters", async () => {
    await logActivity("settings", "Changed the marketing voice");
    const all = await listActivity({}, 1, 1);
    const settings = await listActivity({ area: "settings" }, 1, 500);
    expect(settings.rows.every((r) => r.area === "settings")).toBe(true);
    expect(settings.total).toBe(all.byArea.settings);
    expect(settings.byArea).toEqual(all.byArea); // the tiles keep every area's count
    const recent = await listActivity({ since: Date.now() - 60_000 }, 1, 50);
    expect(recent.rows.map((r) => r.summary)).toEqual(["Changed the marketing voice"]);
    const aoife = await listActivity({ actor: "Aoife Brennan" }, 1, 500);
    expect(aoife.rows.every((r) => r.actor === "Aoife Brennan")).toBe(true);
    expect(all.actors).toEqual([...all.actors].sort());
  });

  it("pages without repeats", async () => {
    const one = await listActivity({}, 1, 10);
    const two = await listActivity({}, 2, 10);
    expect(new Set([...one.rows, ...two.rows].map((r) => r.id)).size).toBe(20);
  });
});
