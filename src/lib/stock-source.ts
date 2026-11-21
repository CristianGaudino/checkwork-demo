import "server-only";
import { cookies } from "next/headers";
import { DEMO_BAR_ENABLED, demoCookiesCount } from "@/lib/demo";
import { STOCK_COOKIE, parseStockSource, type StockSource } from "./stock-source-rules";

// On the demo the bar's switch says (so both versions can be shown); on a real site NEXT_PUBLIC_STOCK_SOURCE does, and a cookie never can.
// The same rule as the margins permission (src/lib/permissions.ts), but only while the bar is on: with it off nothing can change the
// cookie, and the browser (useStockSource in src/lib/demo-role.ts) reads the build's setting, so the server does too.
export async function stockSource(): Promise<StockSource> {
  if (DEMO_BAR_ENABLED && demoCookiesCount()) return parseStockSource((await cookies()).get(STOCK_COOKIE)?.value);
  return parseStockSource(process.env.NEXT_PUBLIC_STOCK_SOURCE);
}
