import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CarGallery } from "./CarGallery";

const photo = (i: number) => ({ src: `/stock/test/${i}.webp`, width: 900, height: 675 });
const render = (count: number) => renderToStaticMarkup(createElement(CarGallery, { photos: Array.from({ length: count }, (_, i) => photo(i)), name: "2019 Audi A4" }));

describe("CarGallery", () => {
  it("no photos: the empty box and nothing else", () => {
    const html = render(0);
    expect(html).toContain("No photo yet");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<img");
  });

  it("one photo: a tappable slide, no counter or arrows", () => {
    const html = render(1);
    expect(html).toContain('aria-label="View photo 1 of 1 larger"');
    expect(html).not.toContain("1 / 1");
    expect(html).not.toContain("Next photo");
  });

  it("three photos: counter and both arrows, and a strip with every photo", () => {
    const html = render(3);
    expect(html).toContain("1 / 3");
    expect(html.match(/aria-label="View photo \d of 3 larger"/g)).toHaveLength(3);
    expect(html.match(/aria-label="Show photo \d of 3"/g)).toHaveLength(3);
    expect(html.match(/<button[^>]*aria-label="Previous photo"[^>]*>/)![0]).toContain('aria-disabled="true"');
    expect(html).toContain('alt="2019 Audi A4, photo 2 of 3"');
  });

  it("every photo is reachable: six photos, six thumbnails, nothing hidden behind Show all", () => {
    const html = render(6);
    expect(html.match(/aria-label="Show photo \d of 6"/g)).toHaveLength(6);
    expect(html).not.toContain("Show all");
  });

  it("twelve photos: twelve thumbnails; sixty: the first eleven and a +49 tile that opens the viewer", () => {
    expect(render(12).match(/aria-label="Show photo \d+ of 12"/g)).toHaveLength(12);
    const html = render(60);
    expect(html.match(/aria-label="Show photo \d+ of 60"/g)).toHaveLength(11);
    expect(html).toContain('aria-label="View all 60 photos"');
    expect(html).toContain("+49");
  });

  it("a feed that repeats a photo still renders every slide", () => {
    const html = renderToStaticMarkup(createElement(CarGallery, { photos: [photo(1), photo(1), photo(1)], name: "2019 Audi A4" }));
    expect(html.match(/aria-label="View photo \d of 3 larger"/g)).toHaveLength(3);
  });

  it("only the first photo is eager and high priority", () => {
    const imgs = render(3).match(/<img[^>]*>/g)!;
    expect(imgs[0]).toContain('fetchPriority="high"');
    expect(imgs[0]).toContain('loading="eager"');
    expect(imgs[1]).toContain('loading="lazy"');
  });
});
