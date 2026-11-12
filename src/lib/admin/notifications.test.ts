import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { markRead, noticeOfLead, noticesFor, noticesStore, notify, NOTICE_KEEP_DAYS } = await import("./notifications");
const { DAY } = await import("@/lib/time");

const aoife = { name: "Aoife Brennan", email: "aoife@example.com" };
const conor = { name: "Conor Doyle", email: "conor@example.com" };

describe("the bell", () => {
  it("is per person: read by one stays unread for the rest, and a notice for someone is theirs alone", async () => {
    for (const n of await noticesStore.list()) await noticesStore.remove(n.id);
    await notify({ kind: "lead", text: "Car enquiry: 2019 Kia Soul", href: "/dashboard/leads/x" });
    await notify({ kind: "assigned", text: "Ciara Walsh gave you a lead: Finance", href: "/dashboard/leads/y", for: "Conor Doyle" });
    expect(noticesFor(await noticesStore.list(), aoife).unread).toBe(1);
    expect(noticesFor(await noticesStore.list(), conor).unread).toBe(2);
    await markRead(conor);
    expect(noticesFor(await noticesStore.list(), conor).unread).toBe(0);
    expect(noticesFor(await noticesStore.list(), aoife).unread).toBe(1);
    const [only] = noticesFor(await noticesStore.list(), aoife).items;
    await markRead(aoife, [only.id]);
    expect(noticesFor(await noticesStore.list(), aoife).unread).toBe(0);
  });

  it("drops what is older than the keep period as new ones come", async () => {
    const now = Date.now();
    await notify({ kind: "sync", text: "The DoneDeal stock did not update", href: "/dashboard/stock" }, now - (NOTICE_KEEP_DAYS + 1) * DAY);
    await notify({ kind: "sync", text: "The DoneDeal stock did not update", href: "/dashboard/stock" }, now);
    expect((await noticesStore.list()).every((n) => n.at >= now - NOTICE_KEEP_DAYS * DAY)).toBe(true);
  });

  it("says the kind of request and the car, never who sent it", () => {
    expect(noticeOfLead({ id: "l1", type: "finance", carTitle: "2019 Kia Soul" }, false)).toEqual({ kind: "lead", text: "Finance: 2019 Kia Soul", href: "/dashboard/leads/l1" });
    expect(noticeOfLead({ id: "l2", type: "warranty" }, false)).toMatchObject({ kind: "warranty", text: "Warranty request" });
    expect(noticeOfLead({ id: "l3", type: "test-drive", carTitle: "2019 Kia Soul" }, true)).toMatchObject({ kind: "drive", href: "/dashboard/test-drives" });
  });
});
