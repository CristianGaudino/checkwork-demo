import { notFound } from "next/navigation";
import { NotInPlan } from "@/components/admin/NotInPlan";
import { MODULES } from "@/lib/modules-rules";
import { hasModule } from "@/lib/modules";

export const metadata = { title: "Not in your plan" };

// Where the proxy sends a dashboard page whose module is off (src/proxy.ts). A module the plan has is not this page.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = MODULES.find((x) => x.id === id);
  if (!m || (await hasModule(m.id))) notFound();
  return <NotInPlan id={m.id} />;
}
