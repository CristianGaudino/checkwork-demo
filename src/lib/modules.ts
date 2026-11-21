import "server-only";
import { notFound } from "next/navigation";
import { MODULE_IDS, type ModuleId } from "./modules-rules";

// The archived dashboard's modules (#173), every one on. The public site has none: it always shows everything (owner, 2026-11-22).
export const enabledModules = async (): Promise<Set<ModuleId>> => new Set(MODULE_IDS);
export const hasModule = async (id: ModuleId) => (await enabledModules()).has(id);
// A page or action of a module that is off answers as if it were not there.
export async function requireModule(id: ModuleId) {
  if (!(await hasModule(id))) notFound();
}
