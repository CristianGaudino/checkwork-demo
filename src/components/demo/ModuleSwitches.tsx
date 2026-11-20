"use client";

import { usePathname, useRouter } from "next/navigation";
import { isAppPath } from "@/lib/demo";
import { useEffect, useId, useRef, useState } from "react";
import { setDemoModules, setDemoRole, useModules } from "@/lib/demo-role";
import { MODULES, MODULE_IDS, withModule, withoutModule, type ModuleId } from "@/lib/modules-rules";
import { MODULE_EUR, TIERS, SHOW_PRICING, eur, planFor, setupEur, switchTier } from "@/lib/billing/rules";
import { press } from "@/components/ui";

// The presets: the tiers, the only plans sold (one branch). Prices a month, before VAT, as the Billing page shows them.
const PLANS = TIERS;

// The demo bar's module switches (#173): show the site as a dealer with only some modules, so each version can be shown. A real site has
// none: its modules are the build setting NEXT_PUBLIC_SITE_MODULES. Turning one on brings what it needs; turning one off takes what needs it.
// `inline`: in the phone panel the list opens in place, under the button, rather than as a popup that would run off a narrow screen.
export function ModuleSwitches({ chip, inline = false }: { chip: string; inline?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const on = useModules();
  const [open, setOpen] = useState(false);
  const [dropped, setDropped] = useState(""); // what the last plan chosen could not keep, said rather than done silently
  const toggle = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const plan = planFor(on);
  // What turning a module on adds to the plan: an add-on's price, or a move to the tier that holds it.
  const addLabel = (id: ModuleId) => {
    const add = planFor(withModule(on, id)).eur - plan.eur; // a per-use module can still move the plan up a tier (AI needs the dashboard)
    return add ? `+${eur(add)}` : MODULE_EUR[id] ? "Included" : "Per use";
  };
  const apply = (next: Iterable<ModuleId>, note = "") => {
    const list = [...next];
    setDropped(note);
    setDemoModules(list);
    if (list.includes("dashboard")) setDemoRole("dealer"); // choosing a plan is the dealer's act, so the switch stays in view
    // Without the dashboard the dealer area is gone (404), so the demo goes to the site's home page.
    if (isAppPath(path) && !list.includes("dashboard")) router.replace("/"); // replace: Back would bring the dealer area back on a plan without it
    else router.refresh();
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
        Plan<span className="ml-1 font-medium text-text">{plan.name}</span>
      </button>
      {open && (
        <div id={panelId} role="group" aria-label="Plan and modules" className={`flex flex-col gap-1 overflow-y-auto rounded-card border border-hairline bg-band p-2 ${inline ? "mt-2 max-h-[50vh] w-full" : "absolute bottom-full left-0 z-50 mb-2 max-h-[70vh] w-80 shadow-panel"}`}>
          <div className="grid grid-cols-2 gap-2 p-1">
            {PLANS.map((p) => (
              <button
                key={p.label}
                type="button"
                aria-pressed={plan.tier.id === p.id}
                onClick={() => {
                  const { modules, dropped } = switchTier(on, p);
                  const names = MODULES.filter((m) => dropped.includes(m.id)).map((m) => m.label);
                  apply(modules, names.length ? `${names.join(", ")} ${names.length === 1 ? "is" : "are"} off: ${p.label} doesn't have what ${names.length === 1 ? "it needs" : "they need"}.` : "");
                }}
                className={`flex min-h-11 flex-col items-start justify-center rounded-control border px-3 py-1.5 text-left text-meta leading-tight ${plan.tier.id === p.id ? "border-accent bg-accent text-on-accent" : "border-hairline"} ${press}`}
              >
                <span className="font-medium whitespace-nowrap">{p.label}</span>
                {SHOW_PRICING && <span className="tabular-nums">{eur(p.eur)} a month</span>}
              </button>
            ))}
          </div>
          {dropped && (
            <p role="status" className="px-2 text-meta text-text-2">
              {dropped}
            </p>
          )}
          {MODULES.map((m) => (
            <label key={m.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 hover:bg-hairline/50">
              <input type="checkbox" checked={on.has(m.id)} onChange={(e) => apply(e.target.checked ? withModule(on, m.id) : withoutModule(on, m.id))} className="size-4 accent-[var(--color-accent)]" />
              <span className="flex-1 text-meta">{m.label}</span>
              {SHOW_PRICING && !on.has(m.id) && <span className="text-meta tabular-nums text-text-2">{addLabel(m.id)}</span>}
            </label>
          ))}
          {/* Kept in view at the foot of the list, so the total follows each switch. */}
          <div className="sticky -bottom-2 -mb-2 flex items-start gap-3 border-t border-hairline bg-band px-2 py-2">
            {SHOW_PRICING && (
              <p className="flex-1 text-meta">
                <span className="font-medium">{plan.name}</span>, <span className="tabular-nums">{eur(plan.eur)}</span> a month before VAT
                <span className="block text-text-2">Plus {eur(setupEur(on))} setup, once</span>
              </p>
            )}
            <button type="button" onClick={() => apply(MODULE_IDS)} className={`ml-auto flex min-h-11 items-center rounded-control border border-hairline px-3 text-meta ${press}`}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
