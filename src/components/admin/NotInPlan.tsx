import Link from "next/link";
import { ActButton } from "@/components/admin/ActButton";
import { adminButton, adminButtonQuiet } from "@/components/admin/kit";
import { card } from "@/components/ui";
import { askModuleAction } from "@/app/dashboard/billing/actions";
import { MODULES, withModule, type ModuleId } from "@/lib/modules-rules";
import { enabledModules } from "@/lib/modules";
import { can } from "@/lib/permissions";
import { SHOW_PRICING, eur, planFor } from "@/lib/billing/rules";
import { billingSettings } from "@/lib/billing/usage";
import { LayersIcon } from "@/components/stock/icons";

// A dashboard page whose module the plan lacks: what it is, what it would add to the bill (owners and managers, while our prices show),
// how to get it, and the way back. Owners and managers ask for it here, as on Billing; anyone else is told who can.
export async function NotInPlan({ id }: { id: ModuleId }) {
  const m = MODULES.find((x) => x.id === id)!;
  const billing = await can("billing");
  let price: string | undefined;
  if (billing && SHOW_PRICING) {
    const [mods, b] = await Promise.all([enabledModules(), billingSettings()]);
    const add = planFor(withModule(mods, id), b).eur - planFor(mods, b).eur;
    price = add > 0 ? `Adds ${eur(add)} a month to your plan, before VAT.` : "Your plan already pays for it: ask and we switch it on.";
  }
  return (
    <div className="flex flex-col items-center px-4 py-12">
      <div className={`${card} flex w-full max-w-lg flex-col items-center gap-3 p-8 text-center`}>
        <span aria-hidden="true" className="grid size-12 place-items-center rounded-control bg-row-alt text-accent-text [&>svg]:size-6">
          <LayersIcon />
        </span>
        <h1 className="text-display font-bold">Not in your plan</h1>
        <p className="text-heading font-semibold">{m.label}</p>
        <p className="max-w-[45ch] text-body text-text-2">{m.blurb}</p>
        <p className="max-w-[45ch] text-meta text-text-2">
          {billing ? (price ?? "Ask and we add it to your plan. Our reply shows in Help.") : "Your owner or manager can ask us to add it to your plan."}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {billing && (
            <ActButton act={askModuleAction.bind(null, id)} done="We have your request. Our reply will show in Help." label={`Ask us to add ${m.label}`} className={adminButton}>
              Ask us to add it
            </ActButton>
          )}
          <Link href="/dashboard" className={adminButtonQuiet}>
            Back to the overview
          </Link>
        </div>
      </div>
    </div>
  );
}
