import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { DEALER_PHONE, DEALER_TEL, SITE_NAME } from "@/lib/site";

// The page Cloudflare's rate limiting rule sends (docs/rate-limit/README.md). It is pasted into the dashboard by hand, so this guards
// what Cloudflare accepts and what a visitor needs from it.
const html = readFileSync("docs/rate-limit/page.html", "utf8");
const CLOUDFLARE_BODY_LIMIT = 30 * 1024; // "The maximum field size is 30 KB."

it("fits in Cloudflare's custom response body", () => {
  expect(Buffer.byteLength(html)).toBeLessThan(CLOUDFLARE_BODY_LIMIT);
});

it("loads nothing from anywhere: the rule answers before the site, and while it does, every other request may be limited too", () => {
  expect(html).not.toMatch(/https?:\/\//);
  expect(html).not.toMatch(/<script|<link|@import|url\((?!#)/i); // url(#id) is the logo's own gradient
});

it("is a whole, accessible page with a retry that works without JavaScript", () => {
  expect(html).toMatch(/<html lang="en">/);
  expect(html).toMatch(/<title>[^<]+<\/title>/);
  expect(html.match(/<h1>/g)).toHaveLength(1);
  expect(html).toContain('<a class="retry" href="">Try again</a>'); // an empty href loads the same URL again
  expect(html).toContain("prefers-color-scheme:dark");
  expect(html).not.toContain("—");
});

it("names the dealer and their phone as site.ts does, so a clone that changes site.ts is told to change the page", () => {
  expect(html).toContain(SITE_NAME);
  expect(html).toContain(`href="tel:${DEALER_TEL}">${DEALER_PHONE}</a>`);
});

it("has a JSON body for /api/* in the site's error shape", () => {
  expect(JSON.parse(readFileSync("docs/rate-limit/api.json", "utf8"))).toEqual({ error: expect.any(String) });
});
