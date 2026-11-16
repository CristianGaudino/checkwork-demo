import { summaryBody } from "@/lib/owner-api/build";
import { ownerGet } from "@/lib/owner-api/handler";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => ownerGet(req, "summary", (r) => summaryBody(r.from, r.to, r.money));
