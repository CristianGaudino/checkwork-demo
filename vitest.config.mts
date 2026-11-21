import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // The deploy job sets APP_ENV=demo and NEXT_PUBLIC_DEMO_BAR=off for every step, which change the roles and the stock cookie: tests start
  // from no build setting and stub one when they need it, so they pass the same in CI, the deploy and on a laptop.
  test: { environment: "node", include: ["src/**/*.test.ts"], setupFiles: ["./vitest.setup.ts"], env: { APP_ENV: "", NEXT_PUBLIC_DEMO_BAR: "" } },
});
