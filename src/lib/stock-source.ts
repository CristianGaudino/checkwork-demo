import "server-only";
import { cookies } from "next/headers";
import { DEMO_BAR_ENABLED, adminReachable } from "@/lib/demo";
import { isProduction } from "@/lib/site";
import { STOCK_COOKIE, parseStockSource, type StockSource } from "./stock-source-rules";

// On the demo the bar's switch says (so both versions can be shown); on a real site NEXT_PUBLIC_STOCK_SOURCE does, and a cookie never can.
// The same rule as the margins permission (src/lib/permissions.ts).
export async function stockSource(): Promise<StockSource> {
  if (DEMO_BAR_ENABLED && (!isProduction() || adminReachable())) return parseStockSource((await cookies()).get(STOCK_COOKIE)?.value);
  return parseStockSource(process.env.NEXT_PUBLIC_STOCK_SOURCE);
}
