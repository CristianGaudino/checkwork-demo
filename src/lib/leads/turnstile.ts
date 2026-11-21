// Turnstile server check (D-05). Pure: the secret is a parameter, so tests need no env.
// developers.cloudflare.com/turnstile/get-started/server-side-validation/
// Answers true, or why the check failed as fixed codes for the lead log: Cloudflare's own error codes, or ours. Never the token, the IP,
// the secret or anything else from the answer.
export async function verifyTurnstile(token: string, ip: string, secret: string): Promise<true | string[]> {
  if (!token) return ["no-token"]; // nothing reached the server: the widget never gave the form one
  if (token.length > 2048) return ["token-too-long"];
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    // A slow Cloudflare answer fails closed after 5 seconds, so the buyer gets "try again", not a frozen button.
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const j = (await res.json()) as { success?: boolean; action?: string; "error-codes"?: unknown };
    if (j.success === true && j.action === "lead") return true;
    // Cloudflare rejected it. Only codes from its documented list are kept; anything else is logged as "other".
    const given = Array.isArray(j["error-codes"]) ? j["error-codes"] : [];
    const codes = [...new Set(given.map((c): string => (CLOUDFLARE_CODES.includes(c) ? c : "other")))];
    if (j.success === true) codes.push("action-mismatch"); // a real token, made for another form or site
    return codes.length ? codes : ["rejected"];
  } catch (e) {
    // Fail closed: no answer in time, no connection, or an answer that is not JSON.
    return [e instanceof DOMException && e.name === "TimeoutError" ? "siteverify-timeout" : "siteverify-failed"];
  }
}

// developers.cloudflare.com/turnstile/get-started/server-side-validation/#error-codes
const CLOUDFLARE_CODES: unknown[] = [
  "missing-input-secret",
  "invalid-input-secret",
  "missing-input-response",
  "invalid-input-response",
  "invalid-widget-id",
  "invalid-parsed-secret",
  "bad-request",
  "timeout-or-duplicate",
  "internal-error",
];
