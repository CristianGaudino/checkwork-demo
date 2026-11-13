// HMAC-SHA256 over a text, as base64url: the signed links (lead photos, unsubscribe). Pure: the secret is a parameter. Each caller signs a
// text that starts with its own purpose, so a signature made for one kind of link never fits another.
const enc = new TextEncoder();
const hmacKey = (secret: string, usage: KeyUsage) => crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function signText(text: string, secret: string): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), enc.encode(text))));
}

// crypto.subtle.verify compares in constant time. A malformed signature is false.
export async function verifyText(text: string, sig: string, secret: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(sig)) return false;
  const bytes = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  return crypto.subtle.verify("HMAC", await hmacKey(secret, "verify"), bytes, enc.encode(text));
}
