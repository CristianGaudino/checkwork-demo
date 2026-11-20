import Link from "next/link";
import { ActButton } from "@/components/admin/ActButton";
import { adminButton, adminButtonQuiet } from "@/components/admin/kit";
import { askModuleAction } from "@/app/dashboard/billing/actions";
import { MODULES, type ModuleId } from "@/lib/modules-rules";
import { can } from "@/lib/permissions";

// A dashboard page whose module the plan lacks: what the module does and, for owners and managers, a request to add it, as on Billing.
export async function NotInPlan({ id }: { id: ModuleId }) {
  const m = MODULES.find((x) => x.id === id)!;
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <h1 className="text-display font-bold">Not in your plan</h1>
      <p className="max-w-[45ch] text-body text-text-2">
        <span className="font-semibold text-text">{m.label}</span>: {m.blurb}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {(await can("billing")) && (
          <ActButton act={askModuleAction.bind(null, id)} done="We have your request. Our reply will show in Help." label={`Ask us to add ${m.label}`} className={adminButton}>
            Ask us to add
          </ActButton>
        )}
        <Link href="/dashboard" className={adminButtonQuiet}>
          Back to the overview
        </Link>
      </div>
    </div>
  );
}
