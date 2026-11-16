import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const get = vi.fn(async (key: string) => ({ body: new Blob([key]).stream() }));
vi.mock("@/lib/leads/bindings", () => ({ getBindings: () => ({ LEAD_PHOTOS: { get } }) }));
const { GET } = await import("./route");

const fetchKey = (key: string) => GET(new Request("https://x.test"), { params: Promise.resolve({ key: key.split("/") }) });

describe("/media-files", () => {
  it("serves a library file from the bucket, cached for a year", async () => {
    const key = "media/3f9a1c2e-0000-4000-8000-000000000001.jpg";
    const r = await fetchKey(key);
    expect(r.status).toBe(200);
    expect(get).toHaveBeenCalledWith(key);
    expect(r.headers.get("cache-control")).toContain("immutable");
  });

  it("never serves a trade-in photo, a path trick or an svg, and does not touch the bucket", async () => {
    get.mockClear();
    for (const key of ["trade-in/abc/1.jpg", "media/../trade-in/x.jpg", "media/x.svg"]) expect((await fetchKey(key)).status).toBe(404);
    expect(get).not.toHaveBeenCalled();
  });
});
