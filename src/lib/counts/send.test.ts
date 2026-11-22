import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminDocs } from "@/lib/db/schema";
import { getDb, truncate } from "@/test/sqlite-db";
import { sendCountsToDash } from "./send";

// 2026-11-20 at 03:17 UTC: Irish day 2026-11-20, so yesterday is 11-19 and the week back is 11-13.
const NOW = Date.parse("2026-11-20T03:17:00Z");
const row = (day: string, event: string, count: number) => ({ collection: "feature-counts", id: `${day}:${event}`, data: { id: `${day}:${event}`, day, event, count } });
const dash = (status = 204) => {
  const fetch = vi.fn(async (_req: Request) => new Response(null, { status }));
  return { fetch };
};
const bodies = (d: ReturnType<typeof dash>) => Promise.all(d.fetch.mock.calls.map(([r]) => r.json()));

beforeEach(async () => {
  await truncate("admin_docs");
  await getDb().insert(adminDocs).values([
    row("2026-11-19", "saved", 3), row("2026-11-19", "filter:make", 5), row("2026-11-13", "saved", 1),
    row("2026-11-12", "saved", 9), // eight days back: not sent
    row("2026-11-20", "saved", 2), // today, still counting: not sent
  ]);
});

describe("sendCountsToDash", () => {
  it("posts one body per day of the last 7, yesterday back, with the key", async () => {
    const d = dash();
    expect(await sendCountsToDash(getDb(), { DASH_SITE_KEY: "k", DASH: d }, NOW)).toBe(2);
    expect(await bodies(d)).toEqual([{ day: "2026-11-13", counts: { saved: 1 } }, { day: "2026-11-19", counts: { saved: 3, "filter:make": 5 } }]);
    const req = d.fetch.mock.calls[0][0];
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe("/api/site/v1/counts");
    expect(req.headers.get("authorization")).toBe("Bearer k");
  });

  it("sends nothing without a key or without anywhere to send", async () => {
    const d = dash();
    expect(await sendCountsToDash(getDb(), { DASH: d }, NOW)).toBe(0);
    expect(await sendCountsToDash(getDb(), { DASH_SITE_KEY: "k" }, NOW)).toBe(0);
    expect(d.fetch).not.toHaveBeenCalled();
  });

  it("survives a dashboard error or a throw, without throwing", async () => {
    expect(await sendCountsToDash(getDb(), { DASH_SITE_KEY: "k", DASH: dash(500) }, NOW)).toBe(0);
    const down = { fetch: vi.fn(async () => Promise.reject(new Error("down"))) };
    expect(await sendCountsToDash(getDb(), { DASH_SITE_KEY: "k", DASH: down }, NOW)).toBe(0);
    expect(down.fetch).toHaveBeenCalledTimes(2); // each day tried, none stops the others
  });
});
