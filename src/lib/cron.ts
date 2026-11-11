// The Worker's scheduled jobs (worker.mjs) call the app's own routes with CRON_KEY, a secret, as a bearer token. Without the key set, no
// request is one.
export function cronAuthorized(req: Request): boolean {
  const key = process.env.CRON_KEY;
  return Boolean(key) && same(req.headers.get("authorization") ?? "", `Bearer ${key}`);
}

// The same length of work however much of the key matches, so the answer time gives nothing away.
function same(a: string, b: string) {
  const [x, y] = [new TextEncoder().encode(a), new TextEncoder().encode(b)];
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
