import { signText, verifyText } from "@/lib/signing";

// The way out of a newsletter or a stock alert email (issue #122), with no login and no typing: a signed link to one record, never the
// email address. One alert per link: stopping a price drop alert leaves that person's other alerts on.
// The link never changes and never expires, so every email to that person carries the same one and an old email still works. It can only
// ever stop that one subscription, so a forwarded email risks nothing more.
// Pure: the secret and the site's address are parameters. The page and the one-click route are src/app/unsubscribe.
export type UnsubscribeKind = "newsletter" | "alert";
export type UnsubscribeTarget = { kind: UnsubscribeKind; id: string };

const KINDS: Record<string, UnsubscribeKind> = { n: "newsletter", a: "alert" };
const ID = /^[A-Za-z0-9-]{1,64}$/;
// "unsubscribe:" first, so a signature made for a photo link never fits here.
const text = (t: UnsubscribeTarget) => `unsubscribe:${t.kind}:${t.id}`;

// The token for the link: "{n|a}.{record id}.{signature}".
export async function unsubscribeToken(t: UnsubscribeTarget, secret: string): Promise<string> {
  if (!ID.test(t.id)) throw new Error("Bad record id");
  return `${t.kind[0]}.${t.id}.${await signText(text(t), secret)}`;
}

// The record a token names, or null when it is malformed, forged, or for another record.
export async function readUnsubscribeToken(token: unknown, secret: string): Promise<UnsubscribeTarget | null> {
  if (typeof token !== "string" || token.length > 200) return null;
  const [k, id, sig, ...rest] = token.split(".");
  const kind = KINDS[k];
  if (rest.length || !kind || !ID.test(id ?? "")) return null;
  return (await verifyText(text({ kind, id }), sig ?? "", secret)) ? { kind, id } : null;
}

// What each email carries: the link in its footer, and the List-Unsubscribe headers (RFC 8058) so Gmail and Outlook show their own
// unsubscribe button. The footer opens a page that asks once; the mail app's button POSTs to its own address (src/app/unsubscribe).
export async function unsubscribeParts(t: UnsubscribeTarget, secret: string, siteUrl: string) {
  const token = await unsubscribeToken(t, secret);
  const base = siteUrl.replace(/\/$/, "");
  const url = `${base}/unsubscribe?t=${token}`;
  const oneClick = `${base}/unsubscribe/one-click?t=${token}`;
  return { url, footer: `To stop these emails: ${url}`, headers: { "List-Unsubscribe": `<${oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
}
