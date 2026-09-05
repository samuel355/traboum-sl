import { currentUser } from "@clerk/nextjs/server";
import { getEffectiveRole } from "@/lib/roles";
import { fetchAllPlots } from "@/lib/plots";
import { fetchCurrentPlotAssignees } from "@/lib/plot-assignees";
import { DashboardMapView } from "@/components/DashboardMapView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();
  const role = getEffectiveRole(user);

  let plots = [];
  let loadError = null;
  try {
    const [allPlots, assignees] = await Promise.all([fetchAllPlots(), fetchCurrentPlotAssignees()]);
    plots = allPlots.map((plot) => ({
      ...plot,
      currentClientName: assignees.get(String(plot.id))?.name ?? null,
    }));
  } catch (err) {
    loadError = err.message;
  }

  return <DashboardMapView plots={plots} loadError={loadError} role={role} />;
}
