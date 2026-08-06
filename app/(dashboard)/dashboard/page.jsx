import { currentUser } from "@clerk/nextjs/server";
import { getEffectiveRole } from "@/lib/roles";
import { fetchAllPlots } from "@/lib/plots";
import { DashboardMapView } from "@/components/DashboardMapView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();
  const role = getEffectiveRole(user);

  let plots = [];
  let loadError = null;
  try {
    plots = await fetchAllPlots();
  } catch (err) {
    loadError = err.message;
  }

  return <DashboardMapView plots={plots} loadError={loadError} role={role} />;
}
