import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production"; // dev needs eval (React debugging) and a websocket (hot reload)
const TURNSTILE = "https://challenges.cloudflare.com";
// Cloudflare Web Analytics (cookieless): the beacon Cloudflare injects, and the address it reports visits to
const ANALYTICS_SCRIPT = "https://static.cloudflareinsights.com";
const ANALYTICS_REPORT = "https://cloudflareinsights.com";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} ${TURNSTILE} ${ANALYTICS_SCRIPT}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com", // lh3: Google review photos
  "font-src 'self' data:",
  `connect-src 'self' ${TURNSTILE} ${ANALYTICS_REPORT}${dev ? " ws: wss:" : ""}`,
  `frame-src ${TURNSTILE} https://maps.google.com https://www.google.com`, // the bot check, and the Google map on /contact
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // No cacheComponents: OpenNext on Cloudflare Workers can't run it yet (opennextjs-cloudflare#1450).
  // Revisit when that is fixed, and update .claude/CLAUDE.md.
  poweredByHeader: false,
  // Images are pre-sized static files and this Worker has no Images binding (RESEARCH Pitfall 1).
  images: { unoptimized: true },
  // The Worker gets no runtime APP_ENV, so inline it at build time for request-time pages (RESEARCH Pitfall 1). Never put a secret here.
  env: { APP_ENV: process.env.APP_ENV ?? "" },
  // Trade-in photos travel in the lead action: 16 MB of photos plus multipart overhead (03-01 spike, research section 3).
  // It applies to every server action; each one validates its input.
  experimental: { serverActions: { bodySizeLimit: "18mb" } },
  // New cars and factory orders were removed (#271): old links and search results go on to the nearest page that is still here.
  async redirects() {
    return [
      { source: "/new-cars", destination: "/used-cars", permanent: true },
      { source: "/new-cars/order", destination: "/find-a-car", permanent: true },
      { source: "/new-cars/:make", destination: "/makes/:make", permanent: true },
    ];
  },
  // Clickjacking and sniffing guards, and a content policy on every page. Scripts, frames, images and connections may come only from this
  // site and the few origins named in CSP below. No nonce: a nonce makes every page render per request (no static pages, no caching on
  // Workers). Inline scripts stay allowed because Next writes them; the policy still blocks eval and any script, frame or request to
  // another origin. e2e/csp.spec.ts fails on any violation. A new third-party origin must be added here.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
