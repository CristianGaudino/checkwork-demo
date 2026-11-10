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

  it("three photos: counter and both arrows on the phone row, and a tile grid for a desktop", () => {
    const html = render(3);
    expect(html).toContain("1 / 3");
    expect(html).toContain('data-testid="photo-grid"');
    expect(html.match(/aria-label="View photo \d of 3 larger"/g)).toHaveLength(6); // three in the row, three in the grid
    expect(html.match(/<button[^>]*aria-label="Previous photo"[^>]*>/)![0]).toContain('aria-disabled="true"');
    expect(html).toContain('alt="2019 Audi A4, photo 2 of 3"');
  });

  it("the grid shows four tiles at most, and says Show all on the last when there are more", () => {
    const html = render(6);
    expect(html.match(/data-testid="photo-grid"[\s\S]*$/)![0].match(/aria-label="View photo \d of 6 larger"/g)).toHaveLength(4);
    expect(html).toContain("Show all 6 photos");
    expect(render(4)).not.toContain("Show all");
  });

  it("only the first photo is eager and high priority", () => {
    const imgs = render(3).match(/<img[^>]*>/g)!;
    expect(imgs[0]).toContain('fetchPriority="high"');
    expect(imgs[0]).toContain('loading="eager"');
    expect(imgs[1]).toContain('loading="lazy"');
  });
});
