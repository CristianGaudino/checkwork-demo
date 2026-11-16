import { same } from "@/lib/cron";

// The owner's program reads every site with one bearer token, the Worker secret OWNER_API_TOKEN (compared in constant time). No token set,
// no token sent or a wrong one all give the same answer: nothing is there. Money (sale values) is included only on a site whose
// contract allows it, the second secret OWNER_API_MONEY=1.
export function ownerAuth(req: Request): { ok: false } | { ok: true; money: boolean } {
  const token = process.env.OWNER_API_TOKEN;
  if (!token || !same(req.headers.get("authorization") ?? "", `Bearer ${token}`)) return { ok: false };
  return { ok: true, money: process.env.OWNER_API_MONEY === "1" };
}
