import { createServer } from "node:http";
import type { Server } from "node:http";

// A stand-in for the dealer dashboard's site API (src/lib/leads/dash.ts), on this machine only: playwright.config.ts points the local
// server's DASH_URL here. It keeps each lead body it receives, so a spec can see what the dashboard would get.
export const DASH_STUB_PORT = 4011;

export type DashBody = { lead: { name: string }; journey?: unknown };

export function startDashStub(): Promise<{ bodies: DashBody[]; server: Server }> {
  const bodies: DashBody[] = [];
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      if (req.method === "POST" && req.url === "/api/site/v1/leads" && req.headers.authorization === "Bearer e2e-dash-key") bodies.push(JSON.parse(raw));
      res.writeHead(201, { "content-type": "application/json" }).end('{"id":"stub"}');
    });
  });
  return new Promise((resolve) => server.listen(DASH_STUB_PORT, "127.0.0.1", () => resolve({ bodies, server })));
}
