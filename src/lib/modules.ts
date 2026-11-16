import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { demoCookiesCount } from "@/lib/demo";
import { MODULES_COOKIE, parseModules, type ModuleId } from "./modules-rules";

// What this dealer has (#173). On the demo the bar's switches say (so each version can be shown); on a real site the build setting
// NEXT_PUBLIC_SITE_MODULES does, and a cookie never can. The same rule as the stock source (src/lib/stock-source.ts).
export const enabledModules = cache(async (): Promise<Set<ModuleId>> => (demoCookiesCount() ? parseModules((await cookies()).get(MODULES_COOKIE)?.value) : parseModules(process.env.NEXT_PUBLIC_SITE_MODULES)));
export const hasModule = async (id: ModuleId) => (await enabledModules()).has(id);
// A page or action of a module that is off answers as if it were not there.
export async function requireModule(id: ModuleId) {
  if (!(await hasModule(id))) notFound();
}
