"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { setDemoModules, useModules } from "@/lib/demo-role";
import { MODULES, MODULE_IDS, withModule, withoutModule } from "@/lib/modules-rules";
import { press } from "@/components/ui";

// The demo bar's module switches (#173): show the site as a dealer with only some modules, so each version can be shown. A real site has
// none: its modules are the build setting NEXT_PUBLIC_SITE_MODULES. Turning one on brings what it needs; turning one off takes what needs it.
// `inline`: in the phone panel the list opens in place, under the button, rather than as a popup that would run off a narrow screen.
export function ModuleSwitches({ chip, inline = false }: { chip: string; inline?: boolean }) {
  const router = useRouter();
  const on = useModules();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const apply = (next: Iterable<(typeof MODULE_IDS)[number]>) => {
    setDemoModules(next);
    router.refresh();
  };

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={root} className={inline && open ? "basis-full" : "relative"}>
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)} className={`${chip} border-hairline text-text-2 ${press}`}>
        Modules<span className="ml-1 font-medium text-text">{on.size === MODULE_IDS.length ? "All" : `${on.size} of ${MODULE_IDS.length}`}</span>
      </button>
      {open && (
        <div id={panelId} role="group" aria-label="Modules" className={`flex flex-col gap-1 overflow-y-auto rounded-card border border-hairline bg-band p-2 ${inline ? "mt-2 max-h-[50vh] w-full" : "absolute bottom-full left-0 z-50 mb-2 max-h-[70vh] w-72 shadow-panel"}`}>
          <div className="flex gap-2 p-1">
            <button type="button" onClick={() => apply(MODULE_IDS)} className={`${chip} flex-1 justify-center border-hairline ${press}`}>
              All
            </button>
            <button type="button" onClick={() => apply([])} className={`${chip} flex-1 justify-center border-hairline ${press}`}>
              Base site only
            </button>
          </div>
          {MODULES.map((m) => (
            <label key={m.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 hover:bg-hairline/50">
              <input type="checkbox" checked={on.has(m.id)} onChange={(e) => apply(e.target.checked ? withModule(on, m.id) : withoutModule(on, m.id))} className="size-4 accent-[var(--color-accent)]" />
              <span className="text-meta">{m.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
