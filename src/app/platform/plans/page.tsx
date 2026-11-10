import { PageHeader, Panel } from "@/components/admin/kit";
import { fmtEur, fmtNum } from "@/lib/admin/format";
import { dealershipsStore } from "@/lib/admin/platform";
import { ADDONS, PLANS } from "@/lib/plans";

export const metadata = { title: "Plans and add-ons" };

export default async function Page() {
  const ds = await dealershipsStore.list();
  const onPlan = (id: string) => ds.filter((d) => d.plan === id).length;
  const withAddon = (id: string) => ds.filter((d) => d.addons.includes(id)).length;
  return (
    <>
      <PageHeader title="Plans and add-ons" text="What is on sale. Prices and limits are set in one place in the code, so a change is a small update." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PLANS.map((p) => (
          <Panel key={p.id} title={p.name}>
            <p className="text-display font-bold tabular-nums">
              {fmtEur(p.priceEur)}
              <span className="ml-1 text-meta font-normal text-text-2">a month</span>
            </p>
            <p className="text-body text-text-2">{p.blurb}</p>
            <ul className="flex flex-col divide-y divide-hairline text-body">
              <li className="flex justify-between py-2"><span>Cars listed</span><span className="tabular-nums">{fmtNum(p.limits.cars)}</span></li>
              <li className="flex justify-between py-2"><span>Leads each month</span><span className="tabular-nums">{fmtNum(p.limits.leads)}</span></li>
              <li className="flex justify-between py-2"><span>Team seats</span><span className="tabular-nums">{fmtNum(p.limits.seats)}</span></li>
            </ul>
            <p className="text-meta text-text-2">{onPlan(p.id)} dealerships on this plan</p>
          </Panel>
        ))}
      </div>
      <Panel title="Add-ons">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ADDONS.map((a) => (
            <li key={a.id} className="flex flex-col gap-1 rounded-control border border-hairline p-4">
              <p className="font-semibold">{a.name}</p>
              <p className="text-meta text-text-2">{a.blurb}</p>
              <p className="mt-1 text-body tabular-nums">{fmtEur(a.priceEur)} a month · {withAddon(a.id)} dealerships</p>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
