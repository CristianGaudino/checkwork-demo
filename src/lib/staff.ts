import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { accessConfig, verifyAccessJwt } from "@/lib/access";
import { adminReachable } from "@/lib/demo";

// Who the dashboard is talking to, checked here and not trusted from a header. A server action runs on a POST to any page (Next 16), so
// the proxy's gate on /dashboard paths is not enough on its own: every dashboard action asks requireStaff() first, and the person is the
// one Cloudflare Access signed for (its token, verified once a request). Open in development and in a build that says so (the E2E run,
// the open demo), as the proxy is.
export type Staff = { ok: false } | { ok: true; email: string };
export const staffIdentity = cache(async (): Promise<Staff> => {
  if (adminReachable()) return { ok: true, email: "" };
  const cfg = accessConfig();
  const token = (await headers()).get("cf-access-jwt-assertion");
  if (!cfg || !token) return { ok: false };
  const who = await verifyAccessJwt(token, cfg);
  return who ? { ok: true, email: who.email.toLowerCase() } : { ok: false };
});

// The first line of every dashboard action: anyone Access did not let in gets nothing, as if the action were not there.
export async function requireStaff(): Promise<void> {
  if (!(await staffIdentity()).ok) notFound();
}
