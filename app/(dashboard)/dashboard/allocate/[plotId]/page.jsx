import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { can, getEffectiveRole } from "@/lib/roles";
import { canManagePlot, fetchPlotById, plotNumber, plotStatus, statusKey, streetName } from "@/lib/plots";
import { AllocationForm } from "@/components/AllocationForm";

export const dynamic = "force-dynamic";

export default async function AllocatePlotPage({ params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!can(role, "allocate")) redirect("/dashboard");

  let plot;
  try {
    plot = await fetchPlotById(params.plotId);
  } catch {
    redirect("/dashboard");
  }

  const plotStatusKey = statusKey(plotStatus(plot));
  if (plotStatusKey !== "available" && plotStatusKey !== "reserved") {
    redirect("/dashboard");
  }
  if (!canManagePlot(role, plot, "allocate")) {
    redirect("/dashboard");
  }

  const agentName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">New Allocation</p>
      <h1 className="mt-1 text-2xl font-bold text-navy-900">
        Plot {plotNumber(plot)}
        {streetName(plot) ? ` — ${streetName(plot)}` : ""}
      </h1>
      <p className="mt-1 text-sm text-navy-500">
        Fill in the client&apos;s details below. An allocation document will be generated and
        emailed/texted to the queen, chief, and surveyor once submitted.
      </p>

      <div className="mt-8">
        <AllocationForm
          plotId={plot.id}
          plotNumber={plotNumber(plot)}
          streetName={streetName(plot)}
          agentName={agentName}
        />
      </div>
    </div>
  );
}
