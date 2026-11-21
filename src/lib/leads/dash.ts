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
// without it, a normal fetch to DASH_URL.
export async function sendToDash(row: LeadRow, emailed: boolean): Promise<void> {
  const key = process.env.DASH_SITE_KEY;
  if (!key) return;
  const fail = (status?: number) => logLead({ leadId: row.id, type: row.type, outcome: "dash_failed", status });
  const dash = getBindings().DASH;
  const base = process.env.DASH_URL || (dash ? DASH_HOST : "");
  if (!base) return fail(); // a key with nowhere to send it

  // The fields of the v1 contract only: no photoKeys (photos stay in this site's bucket) and no notifiedAt.
  const { id, clientRef, type, carId, carSlug, carTitle, carPriceEur, sourcePath, name, phone, email, message, details, consentVersion } = row;
  // The row in hand has no createdAt (D1 fills it on insert, a moment later): consentAt is when this lead was made, so it stands in.
  const at = row.consentAt.getTime();
  const lead = { id, clientRef, type, carId, carSlug, carTitle, carPriceEur, sourcePath, name, phone, email, message, details, consentAt: at, consentVersion, createdAt: at };
  const req = new Request(new URL(PATH, base), {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ lead, emailed, photoCount: row.photoKeys.length }),
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)));
    const res = await Promise.race([dash ? dash.fetch(req) : fetch(req), timeout]);
    // 201 stored, 200 already received (a retry). Anything else is a failure.
    if (res.status !== 200 && res.status !== 201) fail(res.status);
    await res.body?.cancel(); // nothing in the answer is needed; an unread body holds the connection open

  } catch {
    fail();
  } finally {
    clearTimeout(timer);
  }
}
