// The bare domain (demo.checkwork.ie) answers with a permanent redirect (308, so a POST keeps its method) to the same path on the canonical host (www.demo.checkwork.ie),
// so there is one address per page. Plain code with no imports: worker.mjs runs it outside Next, before OpenNext sees the request.
export function apexRedirect(requestUrl: string, canonicalHost: string): string | null {
  const url = new URL(requestUrl);
  if (url.hostname === canonicalHost || url.hostname !== canonicalHost.replace(/^www\./, "")) return null;
  url.hostname = canonicalHost;
  url.protocol = "https:";
  return url.toString();
}
