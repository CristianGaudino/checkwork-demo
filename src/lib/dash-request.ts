// The one way to reach the dashboard's site API: through the DASH service binding if there is one, else a normal fetch. No server-only or
// binding imports on purpose: worker.mjs bundles this (through counts/send.ts) with wrangler, outside Next.
export const DASH_HOST = "https://www.dash.checkwork.ie";

// Never throws: the Response, or undefined for a throw or a timeout (the request is aborted, and the race ends it even if a binding ignores
// the abort). Callers build the Request with redirect "manual", so Cloudflare Access's login page (a 302 to it) is a failure, never a delivery.
export async function askDash(dash: { fetch(req: Request): Promise<Response> } | undefined, req: Request, ms: number): Promise<Response | undefined> {
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => (timer = setTimeout(() => (abort.abort(), reject(new Error("timeout"))), ms)));
    const sent = new Request(req, { signal: abort.signal });
    return await Promise.race([dash ? dash.fetch(sent) : fetch(sent), timeout]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
