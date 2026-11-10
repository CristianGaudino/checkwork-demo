import { PlatformSettingsForm } from "@/components/admin/PlatformForms";
import { PageHeader, Panel, adminButtonQuiet } from "@/components/admin/kit";
import { getPlatformSettings } from "@/lib/admin/platform";
import { resetPlatformAction } from "../actions";

export const metadata = { title: "Platform settings" };

export default async function Page() {
  const s = await getPlatformSettings();
  return (
    <>
      <PageHeader title="Platform settings" text="Defaults for every new dealership." />
      <Panel title="Defaults">
        <PlatformSettingsForm settings={s} />
      </Panel>
      <Panel title="Demo data">
        <p className="max-w-[65ch] text-body">Put the dealerships, invoices and audit log back to how they started.</p>
        <form action={resetPlatformAction}>
          <button type="submit" className={adminButtonQuiet}>
            Reset platform data
          </button>
        </form>
      </Panel>
    </>
  );
}
