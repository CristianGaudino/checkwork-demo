import { usageBody } from "@/lib/owner-api/build";
import { ownerGet } from "@/lib/owner-api/handler";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => ownerGet(req, "usage", (r) => usageBody(r.from, r.to));
