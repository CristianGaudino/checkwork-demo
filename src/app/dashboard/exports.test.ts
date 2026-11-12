import { beforeEach, describe, expect, it, vi } from "vitest";

// The three CSV exports: who may have them, and that each is the list as it is filtered on the page.
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
beforeEach(() => vi.stubEnv("APP_ENV", "demo"));
let role = "Owner";
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "checkwork-demo-role" ? { value: role } : undefined) }),
  headers: async () => ({ get: () => null }),
}));
const stock = await import("./stock/export/route");
const leads = await import("./leads/export/route");
const customers = await import("./customers/export/route");
const { adminCars } = await import("@/lib/admin/stock-admin");
const { customersStore } = await import("@/lib/admin/collections");

const get = async (route: { GET: (r: Request) => Promise<Response> }, path: string) => route.GET(new Request(`http://localhost${path}`));
const lines = async (r: Response) => (await r.text()).replace(/^﻿/, "").trim().split("\r\n");

describe("the CSV exports", () => {
  it("leads and customers are personal data: owners and managers only", async () => {
    for (const r of ["Sales", "Finance"]) {
      role = r;
      expect((await get(leads, "/dashboard/leads/export")).status).toBe(404);
      expect((await get(customers, "/dashboard/customers/export")).status).toBe(404);
    }
    role = "Manager";
    expect((await get(leads, "/dashboard/leads/export")).status).toBe(200);
  });

  it("stock follows the view and every filter, and has the costs only for the margins roles", async () => {
    role = "Owner";
    const all = await adminCars();
    const box = all.find((c) => c.gearbox === "automatic" && !c.soldAt)!;
    const rows = await lines(await get(stock, `/dashboard/stock/export?view=all&gearbox=automatic&make=${box.makeSlug}`));
    expect(rows[0]).toContain("Cost (€)");
    expect(rows.length - 1).toBe(all.filter((c) => c.gearbox === "automatic" && c.makeSlug === box.makeSlug).length);
    expect(rows.slice(1).every((r) => r.includes("Automatic"))).toBe(true);
    role = "Sales";
    expect((await lines(await get(stock, "/dashboard/stock/export")))[0]).not.toContain("Cost");
  });

  it("leads follow the status filter", async () => {
    role = "Owner";
    const rows = await lines(await get(leads, "/dashboard/leads/export?status=won"));
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.slice(1).every((r) => r.includes(",Won,"))).toBe(true);
  });

  it("customers follow the tab, its search and its filters", async () => {
    role = "Owner";
    const people = await customersStore.list();
    const agreed = people.filter((c) => c.marketingConsent).length;
    expect((await lines(await get(customers, "/dashboard/customers/export?consent=true"))).length - 1).toBe(agreed);
    const one = people[0];
    const found = await lines(await get(customers, `/dashboard/customers/export?q=${encodeURIComponent(one.email)}`));
    expect(found.slice(1).every((r) => r.includes(one.email))).toBe(true);
    expect((await lines(await get(customers, "/dashboard/customers/export?tab=newsletter&state=unsubscribed"))).slice(1).every((r) => r.includes("Unsubscribed"))).toBe(true);
    expect((await lines(await get(customers, "/dashboard/customers/export?tab=alerts")))[0]).toMatch(/^Email,Alert,/);
  });
});
