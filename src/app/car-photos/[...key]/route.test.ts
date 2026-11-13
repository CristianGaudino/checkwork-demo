import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const get = vi.fn(async (key: string) => ({ body: new Blob([key]).stream() }));
vi.mock("@/lib/leads/bindings", () => ({ getBindings: () => ({ LEAD_PHOTOS: { get } }) }));
const { GET } = await import("./route");

const fetchKey = (key: string) => GET(new Request("https://x.test"), { params: Promise.resolve({ key: key.split("/") }) });

describe("/car-photos", () => {
  it("serves a car's photo, cached for a year", async () => {
    const r = await fetchKey("cars/4710001/3f9a1c2e-0000-4000-8000-000000000001.jpg");
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toContain("immutable");
  });

  it("never serves a trade-in photo from the same bucket, or anything off the pattern", async () => {
    get.mockClear();
    for (const key of ["trade-in/abc/1.jpg", "sourcing/abc/1.jpg", "cars/../trade-in/x.jpg", "cars/4710001/x.jpg", "cars/abc/3f9a1c2e-0000-4000-8000-000000000001.jpg"]) expect((await fetchKey(key)).status).toBe(404);
    expect(get).not.toHaveBeenCalled();
  });
});
