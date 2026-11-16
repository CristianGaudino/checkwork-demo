"use client";

import { useModules } from "@/lib/demo-role";
import { pathAllowed, type ModuleId } from "@/lib/modules-rules";

// Shows its children only while the dealer has the module (#173): named by `id`, the one a link's `href` belongs to, or any of `hrefs` (a
// group of links). For links and sections drawn on the server, so a page built ahead of time still drops a link to a module that is off.
// `not`: the other way round, for what stands in when the module is off. The page itself refuses too.
export function IfModule({ id, href, hrefs, not = false, children }: { id?: ModuleId; href?: string; hrefs?: readonly string[]; not?: boolean; children: React.ReactNode }) {
  const on = useModules();
  const has = id ? on.has(id) : href ? pathAllowed(href, on) : hrefs ? hrefs.some((h) => pathAllowed(h, on)) : true;
  const ok = has !== not;
  return ok ? children : null;
}
