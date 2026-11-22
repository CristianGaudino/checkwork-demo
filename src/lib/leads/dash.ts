import "server-only";
import type { LeadRow } from "./process";
import { logLead } from "@/lib/log";
import { getBindings } from "./bindings";

// The dealer dashboard (checkwork-dash, site API v1, docs/dealer-admin.md). The site key decides the dealer: nothing here names one.
const PATH = "/api/site/v1/leads";
const DASH_HOST = "https://www.dash.checkwork.ie";
const TIMEOUT_MS = 5000;

// Best effort, never throws: the lead is already stored (and emailed), so a failure is logged by id, type and status only.
// Unset DASH_SITE_KEY: nothing is sent. With the DASH service binding the request goes Worker to Worker, past Cloudflare Access;
// without it, a normal fetch to DASH_URL. `dash` is read by the caller while the request is live (this runs later, in after()).
export async function sendToDash(row: LeadRow, emailed: boolean, dash = getBindings().DASH): Promise<void> {
  const key = process.env.DASH_SITE_KEY;
  if (!key) return;
  const fail = (status?: number) => logLead({ leadId: row.id, type: row.type, outcome: "dash_failed", status });
  const base = process.env.DASH_URL || (dash ? DASH_HOST : "");
  if (!base) return fail(); // a key with nowhere to send it

  // The fields of the v1 contract only: no photoKeys (photos stay in this site's bucket) and no notifiedAt.
  const { id, clientRef, type, carId, carSlug, carTitle, carPriceEur, sourcePath, name, phone, email, message, details, consentVersion } = row;
  // The row in hand has no createdAt (D1 fills it on insert, a moment later): consentAt is when this lead was made, so it stands in.
  const at = row.consentAt.getTime();
  const lead = { id, clientRef, type, carId, carSlug, carTitle, carPriceEur, sourcePath, name, phone, email, message, details, consentAt: at, consentVersion, createdAt: at };
  // journey: the visit's note, only when the buyer switched sharing on (checked by journey.ts when the lead came in).
  const body = JSON.stringify({ lead, emailed, photoCount: row.photoKeys.length, ...(row.journey && { journey: row.journey }) });

  // Two tries: a dashboard deploy or a network blip is retried once (safe: the same clientRef is stored once). A 4xx is not retried.
  let status: number | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    status = await tryOnce(dash, new URL(PATH, base), key, body);
    if (status === 200 || status === 201) return;
    if (status !== undefined && status < 500) break;
  }
  fail(status);
}

// One send: the status, or undefined for a throw or a timeout (the request is aborted, not left running). Redirects are not followed, so
// Cloudflare Access's login page (a 302 to it) is a failure, never a delivery.
async function tryOnce(dash: ReturnType<typeof getBindings>["DASH"], url: URL, key: string, body: string): Promise<number | undefined> {
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const req = new Request(url, { method: "POST", redirect: "manual", signal: abort.signal, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body });
    const timeout = new Promise<never>((_, reject) => (timer = setTimeout(() => (abort.abort(), reject(new Error("timeout"))), TIMEOUT_MS)));
    const res = await Promise.race([dash ? dash.fetch(req) : fetch(req), timeout]);
    res.body?.cancel().catch(() => {}); // nothing in the answer is needed; an unread body holds the connection open
    return res.status;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

const TAKEN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
const TAKEN_MAX = 2000; // a car's slots over the two months ahead are far fewer

// The slot starts already taken for a car ("YYYY-MM-DD HH:MM"), asked of the dashboard like a lead is sent. Never throws: no key, no binding,
// a failure, a timeout or an answer that is not the contract all give [], so the form works as if nothing were taken.
export async function takenDriveTimesFromDash(carId: string, dash = getBindings().DASH): Promise<string[]> {
  const key = process.env.DASH_SITE_KEY;
  const base = process.env.DASH_URL || (dash ? DASH_HOST : "");
  if (!key || !base) return [];
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const url = new URL("/api/site/v1/drives/taken", base);
    url.searchParams.set("carId", carId);
    const req = new Request(url, { redirect: "manual", signal: abort.signal, headers: { Authorization: `Bearer ${key}` } });
    const timeout = new Promise<never>((_, reject) => (timer = setTimeout(() => (abort.abort(), reject(new Error("timeout"))), TIMEOUT_MS)));
    const res = await Promise.race([dash ? dash.fetch(req) : fetch(req), timeout]);
    if (res.status !== 200) {
      res.body?.cancel().catch(() => {});
      return [];
    }
    const times = ((await Promise.race([res.json(), timeout])) as { times?: unknown })?.times;
    return Array.isArray(times) && times.length <= TAKEN_MAX && times.every((t) => typeof t === "string" && TAKEN.test(t)) ? (times as string[]) : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
