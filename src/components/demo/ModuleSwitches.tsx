"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { setDemoModules, useModules } from "@/lib/demo-role";
import { MODULES, withModule, withoutModule, type ModuleId } from "@/lib/modules-rules";
import { BASE_EUR, BUNDLES, MODULE_EUR, SHOW_PRICING, eur, planFor, presetName, setupEur } from "@/lib/billing/rules";
import { press } from "@/components/ui";

// The presets: the base site alone, then each bundle. Prices a month, before VAT, as the Billing page shows them.
const PLANS: { label: string; modules: readonly ModuleId[]; eur: number }[] = [{ label: "Base only", modules: [], eur: BASE_EUR }, ...BUNDLES];

// The demo bar's module switches (#173): show the site as a dealer with only some modules, so each version can be shown. A real site has
// none: its modules are the build setting NEXT_PUBLIC_SITE_MODULES. Turning one on brings what it needs; turning one off takes what needs it.
// `inline`: in the phone panel the list opens in place, under the button, rather than as a popup that would run off a narrow screen.
export function ModuleSwitches({ chip, inline = false }: { chip: string; inline?: boolean }) {
  const router = useRouter();
  const on = useModules();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const plan = planFor(on);
  const preset = presetName(on);
  const apply = (next: Iterable<ModuleId>) => {
    setDemoModules(next);
    router.refresh();
  };

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus(); // the panel goes, so focus goes back to its button rather than the page
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={root} className={inline && open ? "basis-full" : "relative"}>
      <button ref={toggle} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)} className={`${chip} border-hairline text-text-2 ${press}`}>
        Plan<span className="ml-1 font-medium text-text">{preset}</span>
      </button>
      {open && (
        <div id={panelId} role="group" aria-label="Plan and modules" className={`flex flex-col gap-1 overflow-y-auto rounded-card border border-hairline bg-band p-2 ${inline ? "mt-2 max-h-[50vh] w-full" : "absolute bottom-full left-0 z-50 mb-2 max-h-[70vh] w-80 shadow-panel"}`}>
          <div className="grid grid-cols-2 gap-2 p-1">
            {PLANS.map((p) => (
              <button
                key={p.label}
                type="button"
                aria-pressed={preset === p.label}
                onClick={() => apply(p.modules)}
                className={`flex min-h-11 flex-col items-start justify-center rounded-control border px-3 py-1.5 text-left text-meta leading-tight ${preset === p.label ? "border-accent bg-accent text-on-accent" : "border-hairline"} ${press}`}
              >
                <span className="font-medium whitespace-nowrap">{p.label}</span>
                {SHOW_PRICING && <span className="tabular-nums">{eur(p.eur)} a month</span>}
              </button>
            ))}
          </div>
          {MODULES.map((m) => (
            <label key={m.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 hover:bg-hairline/50">
              <input type="checkbox" checked={on.has(m.id)} onChange={(e) => apply(e.target.checked ? withModule(on, m.id) : withoutModule(on, m.id))} className="size-4 accent-[var(--color-accent)]" />
              <span className="flex-1 text-meta">{m.label}</span>
              {SHOW_PRICING && <span className="text-meta tabular-nums text-text-2">{MODULE_EUR[m.id] ? eur(MODULE_EUR[m.id]) : "Per use"}</span>}
            </label>
          ))}
          {SHOW_PRICING && (
            <p className="border-t border-hairline px-2 pt-2 text-meta">
              <span className="font-medium">{plan.name}</span>, {eur(plan.eur)} a month before VAT
              <span className="block text-text-2">Plus {eur(setupEur(on))} setup, once</span>
              {plan.saving > 0 && <span className="block text-ok">Saves {eur(plan.saving)} on single prices</span>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
