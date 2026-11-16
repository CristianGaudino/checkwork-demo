import { describe, expect, it } from "vitest";
import { MEDIA_LIMITS, checkUpload, sniffVideo } from "./media-rules";

const jpeg = (n = 100) => Uint8Array.from({ length: n }, (_, i) => [0xff, 0xd8, 0xff][i] ?? 0);
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const video = (brand = "isom", n = 100) => Uint8Array.from({ length: n }, (_, i) => (i === 3 ? 0x18 : i >= 4 && i < 8 ? "ftyp".charCodeAt(i - 4) : i >= 8 && i < 12 ? brand.charCodeAt(i - 8) : 0));

describe("upload checks", () => {
  it("takes JPEG and PNG photos by their bytes, whatever the file is called", () => {
    expect(checkUpload(jpeg())).toMatchObject({ ok: true, kind: "image", ext: "jpg" });
    expect(checkUpload(png)).toMatchObject({ ok: true, kind: "image", ext: "png" });
  });
  it("refuses a photo that is too big, and anything that is not a photo or a video", () => {
    expect(checkUpload(jpeg(MEDIA_LIMITS.imageBytes + 1))).toMatchObject({ ok: false });
    expect(checkUpload(new TextEncoder().encode("<script>alert(1)</script>"))).toMatchObject({ ok: false });
    expect(checkUpload(new Uint8Array(0))).toMatchObject({ ok: false });
  });
  it("knows an MP4 from a MOV", () => {
    expect(sniffVideo(video("isom"))?.ext).toBe("mp4");
    expect(sniffVideo(video("qt  "))?.ext).toBe("mov");
    expect(sniffVideo(jpeg())).toBeNull();
    expect(sniffVideo(video("heic"))).toBeNull(); // an image or audio file in the same box format
  });
  it("takes a video only with a sensible length and size", () => {
    expect(checkUpload(video(), 30)).toMatchObject({ ok: true, kind: "video", ext: "mp4" });
    expect(checkUpload(video(), MEDIA_LIMITS.videoSeconds + 1)).toMatchObject({ ok: false });
    expect(checkUpload(video())).toMatchObject({ ok: false }); // no length read
    expect(checkUpload(video(), Number.NaN)).toMatchObject({ ok: false });
    expect(checkUpload(video("isom", MEDIA_LIMITS.videoBytes + 1), 30)).toMatchObject({ ok: false });
  });
});
