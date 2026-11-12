import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const me = { name: "Aoife Brennan", email: "aoife@example.com", role: "Owner" as const };
vi.mock("@/lib/permissions", () => ({ currentMember: async () => me }));
const { loadNotices, readNotices } = await import("./actions");
const { notify, noticesStore } = await import("@/lib/admin/notifications");

describe("the bell's actions", () => {
  it("refuse anything but a list of ids, never reading it as all", async () => {
    for (const n of await noticesStore.list()) await noticesStore.remove(n.id);
    await notify({ kind: "lead", text: "Finance: 2019 Kia Soul", href: "/dashboard/leads/a" });
    await notify({ kind: "lead", text: "Car enquiry: 2019 Kia Soul", href: "/dashboard/leads/b" });
    const [first] = (await loadNotices()).items;
    for (const bad of ["note", first.id, { length: 1 }, [1, 2], null]) await readNotices(bad);
    expect((await loadNotices()).unread).toBe(2);
    await readNotices([first.id]);
    expect((await loadNotices()).unread).toBe(1);
    await readNotices();
    expect((await loadNotices()).unread).toBe(0);
  });
});
