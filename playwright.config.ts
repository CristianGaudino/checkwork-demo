import { defineConfig, devices } from "@playwright/test";
import { DASH_STUB_PORT, DASH_STUB_URL } from "./e2e/dash-stub";

// Runs against E2E_BASE_URL, or a local production build (npm run build && npm start) on PORT (default 3000).
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;

export default defineConfig({
  testDir: "e2e",
  // A CI runner is slower than a laptop: a longer wait on every check, and one retry so a stray slow test does not fail the pull request.
  retries: process.env.CI ? 1 : 0,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL, ...devices["Pixel 7"] },
  // Specs run in parallel against one server, and many assume the newest car is the first demo car. A spec that adds or edits cars
  // (admin-stock) would change what they see, so it runs alone, after everything else.
  projects: [
    { name: "main", testIgnore: /admin-stock\.spec/ },
    { name: "stock-writes", testMatch: /admin-stock\.spec/, dependencies: ["main"] },
  ],
  // E2E_FAIL_QUERY is the failure-state switch; a server already running on that port without it makes the failure specs fail.
  // E2E_FAKE_BACKENDS swaps the lead store and mailer for in-memory fakes (src/lib/leads/deps.ts). Only ever set here.
  // DASH_URL is a stub dealer dashboard on this machine (e2e/dash-stub-server.mjs) that runs for the whole run and takes every lead.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        { command: `node e2e/dash-stub-server.mjs ${DASH_STUB_PORT}`, url: `${DASH_STUB_URL}/bodies`, reuseExistingServer: false },
        { command: "npm start", url: baseURL, reuseExistingServer: false, env: { E2E_FAIL_QUERY: "e2e-forced-failure", E2E_FAKE_BACKENDS: "1", UNSUBSCRIBE_SECRET: "e2e-unsubscribe-secret", OWNER_API_TOKEN: "e2e-owner-token", DASH_SITE_KEY: "e2e-dash-key", DASH_URL: DASH_STUB_URL } },
      ],
});
