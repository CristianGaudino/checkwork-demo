import { createServer } from "node:http";

// A stand-in for the dealer dashboard's site API (src/lib/leads/dash.ts), on this machine only, for the whole E2E run (playwright.config.ts
// starts it and points the local server's DASH_URL here). Every request gets a 201, so no spec's lead logs a failed send. It keeps each lead
// body it receives; GET /bodies hands them to a spec (e2e/dash-stub.ts).
const port = Number(process.argv[2]);
const bodies = [];
const countBodies = []; // the nightly counts (POST /api/site/v1/counts); GET /count-bodies

createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    if (req.method === "GET" && req.url === "/bodies") return res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(bodies));
    if (req.method === "GET" && req.url === "/count-bodies") return res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(countBodies));
    if (req.method === "POST" && req.url === "/api/site/v1/leads" && req.headers.authorization === "Bearer e2e-dash-key") {
      try {
        bodies.push(JSON.parse(raw));
      } catch {}
    }
    if (req.method === "POST" && req.url === "/api/site/v1/counts" && req.headers.authorization === "Bearer e2e-dash-key") {
      try {
        countBodies.push(JSON.parse(raw));
      } catch {}
      return res.writeHead(204).end();
    }
    res.writeHead(201, { "content-type": "application/json" }).end('{"id":"stub"}');
  });
})
  .on("error", (e) => {
    console.error(`dash stub: ${e.message}`);
    process.exit(1);
  })
  .listen(port, "127.0.0.1");
